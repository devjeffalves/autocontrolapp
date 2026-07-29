import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'GROQ_API_KEY não configurada no servidor.' 
      }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const { message, history = [] } = await request.json();

    await dbConnect();
    
    // Buscar todos os registros fechados para contexto completo sem limitar apenas aos 10 últimos
    const [rides, vehicle] = await Promise.all([
      Ride.find({ status: 'closed' }).sort({ date: -1 }),
      Vehicle.findOne({})
    ]);

    let globalCost = 0;
    let globalLitres = 0;
    let globalKm = 0;
    rides.forEach(r => {
      globalKm += (r.kmTotal || 0);
      r.fuelings?.forEach((f: any) => {
        globalCost += (f.cost || 0);
        globalLitres += (f.litres || 0);
      });
    });

    const avgFuelPrice = globalLitres > 0 ? (globalCost / globalLitres) : 5.50;
    const calculatedAvgConsumption = globalLitres > 0 ? (globalKm / globalLitres) : 0;
    const isConsumptionInconsistent = globalLitres > 0 && (calculatedAvgConsumption < 6 || calculatedAvgConsumption > 25);

    const vehicleAvgConsumption = (globalLitres > 0 && !isConsumptionInconsistent)
      ? calculatedAvgConsumption
      : (vehicle?.avgConsumption || 14.5);

    // Agrupar estatísticas consolidadas por mês (Maio, Junho, Julho, etc.)
    const monthlySummary: Record<string, {
      mes: string;
      faturamento: number;
      lucroLiquido: number;
      kmTotal: number;
      corridas: number;
      horasTrabalhadas: number;
      combustivelGasto: number;
      rendimentoKmL: number;
      lucroPorKm: number;
      lucroPorHora: number;
    }> = {};

    const detailedRides = rides.map(r => {
      const kmTotal = r.kmTotal || 0;
      let rideFuelPrice = avgFuelPrice;
      const rideFuelCost = r.fuelings?.reduce((acc: number, f: any) => acc + (f.cost || 0), 0) || 0;
      const rideFuelLitres = r.fuelings?.reduce((acc: number, f: any) => acc + (f.litres || 0), 0) || 0;
      if (rideFuelLitres > 0) {
        rideFuelPrice = rideFuelCost / rideFuelLitres;
      }
      
      const fuelCostConsumed = (kmTotal / vehicleAvgConsumption) * rideFuelPrice;
      const lucro = (r.platform === 'Passeio') ? 0 : ((r.earnings || 0) - fuelCostConsumed);

      let diffHours = 0;
      let rideDurationStr = "Não informada";
      if (r.startTime && r.endTime) {
        const totalDiffMs = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
        const totalPauseMs = (r.pauses || []).reduce((acc: number, p: any) => {
          const pStart = new Date(p.startTime).getTime();
          const pEnd = p.endTime ? new Date(p.endTime).getTime() : pStart;
          return acc + Math.max(0, pEnd - pStart);
        }, 0);
        const workingMs = Math.max(0, totalDiffMs - totalPauseMs);
        diffHours = workingMs / (1000 * 60 * 60);
        const diffMin = Math.round(workingMs / 60000);
        if (diffMin > 0) {
          const hours = Math.floor(diffMin / 60);
          const mins = diffMin % 60;
          rideDurationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
      }

      // Agrupamento mensal
      const d = new Date(r.date || r.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthLabel = `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;

      if (!monthlySummary[monthKey]) {
        monthlySummary[monthKey] = {
          mes: monthLabel,
          faturamento: 0,
          lucroLiquido: 0,
          kmTotal: 0,
          corridas: 0,
          horasTrabalhadas: 0,
          combustivelGasto: 0,
          rendimentoKmL: 0,
          lucroPorKm: 0,
          lucroPorHora: 0
        };
      }

      if (r.platform !== 'Passeio') {
        monthlySummary[monthKey].faturamento += (r.earnings || 0);
        monthlySummary[monthKey].lucroLiquido += lucro;
        monthlySummary[monthKey].corridas += (r.rides || 0);
      }
      monthlySummary[monthKey].kmTotal += kmTotal;
      monthlySummary[monthKey].horasTrabalhadas += diffHours;
      monthlySummary[monthKey].combustivelGasto += fuelCostConsumed;

      return {
        data: d.toLocaleDateString('pt-BR'),
        mes: monthLabel,
        ganhos: r.earnings || 0,
        km: kmTotal,
        lucro: Number(lucro.toFixed(2)),
        plataforma: r.platform,
        duracaoTurno: rideDurationStr
      };
    });

    // Agrupamento por Dia da Semana (Domingo a Sábado)
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const weekdaySummary: Record<string, {
      dia: string;
      faturamentoTotal: number;
      lucroTotal: number;
      kmTotal: number;
      horasTrabalhadas: number;
      turnosCount: number;
      ganhoMedioPorHora: number;
      lucroMedioPorKm: number;
    }> = {};

    dayNames.forEach(d => {
      weekdaySummary[d] = {
        dia: d,
        faturamentoTotal: 0,
        lucroTotal: 0,
        kmTotal: 0,
        horasTrabalhadas: 0,
        turnosCount: 0,
        ganhoMedioPorHora: 0,
        lucroMedioPorKm: 0
      };
    });

    rides.forEach(r => {
      if (r.platform === 'Passeio') return;
      const d = new Date(r.startTime || r.date || r.createdAt);
      const dayName = dayNames[d.getDay()];
      
      const kmTotal = r.kmTotal || 0;
      let rideFuelPrice = avgFuelPrice;
      const rideFuelCost = r.fuelings?.reduce((acc: number, f: any) => acc + (f.cost || 0), 0) || 0;
      const rideFuelLitres = r.fuelings?.reduce((acc: number, f: any) => acc + (f.litres || 0), 0) || 0;
      if (rideFuelLitres > 0) rideFuelPrice = rideFuelCost / rideFuelLitres;
      const fuelCostConsumed = (kmTotal / vehicleAvgConsumption) * rideFuelPrice;
      const lucro = (r.earnings || 0) - fuelCostConsumed;

      let diffHours = 0;
      if (r.startTime && r.endTime) {
        const totalDiffMs = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
        const totalPauseMs = (r.pauses || []).reduce((acc: number, p: any) => {
          const pStart = new Date(p.startTime).getTime();
          const pEnd = p.endTime ? new Date(p.endTime).getTime() : pStart;
          return acc + Math.max(0, pEnd - pStart);
        }, 0);
        diffHours = Math.max(0, (totalDiffMs - totalPauseMs)) / (1000 * 60 * 60);
      }

      if (weekdaySummary[dayName]) {
        weekdaySummary[dayName].faturamentoTotal += (r.earnings || 0);
        weekdaySummary[dayName].lucroTotal += lucro;
        weekdaySummary[dayName].kmTotal += kmTotal;
        weekdaySummary[dayName].horasTrabalhadas += diffHours;
        weekdaySummary[dayName].turnosCount += 1;
      }
    });

    const monthlyList = Object.values(monthlySummary).map(m => {
      const faturamentoNum = Number(m.faturamento.toFixed(2));
      const lucroNum = Number(m.lucroLiquido.toFixed(2));
      const combustivelNum = Number(m.combustivelGasto.toFixed(2));
      const kmNum = Number(m.kmTotal.toFixed(1));
      const horasNum = Number(m.horasTrabalhadas.toFixed(1));
      const lucroKm = kmNum > 0 ? Number((lucroNum / kmNum).toFixed(2)) : 0;
      const lucroHora = horasNum > 0 ? Number((lucroNum / horasNum).toFixed(2)) : 0;

      return {
        mes: m.mes,
        faturamento_formatado: `R$ ${faturamentoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        lucro_liquido_formatado: `R$ ${lucroNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        combustivel_gasto_formatado: `R$ ${combustivelNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        km_total_formatado: `${kmNum.toLocaleString('pt-BR')} km`,
        corridas: m.corridas,
        horas_trabalhadas_formatado: `${horasNum.toLocaleString('pt-BR')} horas`,
        lucro_por_km_formatado: `R$ ${lucroKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km`,
        lucro_por_hora_formatado: `R$ ${lucroHora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h`
      };
    });

    const weekdayList = Object.values(weekdaySummary).map(w => {
      const fatNum = Number(w.faturamentoTotal.toFixed(2));
      const lucroNum = Number(w.lucroTotal.toFixed(2));
      const kmNum = Number(w.kmTotal.toFixed(1));
      const horasNum = Number(w.horasTrabalhadas.toFixed(1));
      const ganhoHora = horasNum > 0 ? Number((fatNum / horasNum).toFixed(2)) : 0;
      const lucroKm = kmNum > 0 ? Number((lucroNum / kmNum).toFixed(2)) : 0;

      return {
        dia_da_semana: w.dia,
        faturamento_total_formatado: `R$ ${fatNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        lucro_total_formatado: `R$ ${lucroNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        km_total_formatado: `${kmNum.toLocaleString('pt-BR')} km`,
        horas_trabalhadas_formatado: `${horasNum.toLocaleString('pt-BR')} horas`,
        turnos_realizados: w.turnosCount,
        ganho_medio_por_hora_formatado: `R$ ${ganhoHora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/hora`,
        lucro_medio_por_km_formatado: `R$ ${lucroKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km`
      };
    });

    // Limitar history aos últimos 4 itens e podar mensagens antigas longas do assistente para não estourar limite de tokens
    const prunedHistory = (history || []).slice(-4).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.role === 'user' 
        ? String(h.content || '') 
        : String(h.content || '').slice(0, 250) + (String(h.content || '').length > 250 ? '...' : '')
    }));

    // Minimizar token payload do system prompt incluindo duração do turno
    const compactRides = detailedRides.slice(0, 20).map(r => ({
      d: r.data,
      g: r.ganhos,
      l: r.lucro,
      k: r.km,
      dur: r.duracaoTurno,
      p: r.plataforma
    }));

    const systemPrompt = `
      Você é a "Assistente de Bordo" da Auto Control, parceira inteligente de motoristas de aplicativo. Responda em Português do Brasil.
      
      REGRAS RÍGIDAS DE FORMATAÇÃO E VALORES:
      1. NUNCA altere os valores fornecidos. Copie EXATAMENTE a string pré-formatada (ex: "R$ 3.232,83").
      2. NUNCA utilize tabelas em sintaxe de tubo markdown (| Mês | Faturamento |). Apresente SEMPRE em tópicos com marcadores.
      3. Seja concisa, objetiva e direta para facilitar a leitura no celular.

      VEÍCULO: ${vehicle?.model || 'Não cadastrado'} (${vehicleAvgConsumption.toFixed(1)} km/L)

      RESUMO MENSAL (USAR ESTES VALORES):
      ${JSON.stringify(monthlyList)}

      RENTABILIDADE POR DIA (USAR ESTES VALORES):
      ${JSON.stringify(weekdayList)}

      ÚLTIMAS CORRIDAS (dur = duração do turno):
      ${JSON.stringify(compactRides)}

      SUAS CAPACIDADES E INSTRUÇÕES PRINCIPAIS:
      1. VOCÊ POSSUI ACESSO COMPLETO AO TEMPO TRABALHADO E HORAS DOS TURNOS DO MOTORISTA.
         - Nas 'ÚLTIMAS CORRIDAS', a propriedade 'dur' indica a duração exata do turno (ex: "4h 58m").
         - No 'RESUMO MENSAL' e 'RENTABILIDADE POR DIA', a propriedade 'horas_trabalhadas_formatado' informa o total acumulado de horas.
         - NUNCA diga que não possui registro de horas ou tempo trabalhado.
      2. Indicar os melhores dias/horários com base na RENTABILIDADE POR DIA (maior ganho por hora em R$/h).
      3. Dar dicas práticas de economia de combustível (velocidade constante 60-80 km/h, pneus calibrados, reduzir marcha lenta e rotas sem passageiro).
      4. Informar faturamento, lucro e horas exatas quando perguntado sobre qualquer período.
    `;

    const targetModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    let text = "";

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...prunedHistory,
          { role: 'user', content: message }
        ],
        model: targetModel,
      });
      text = chatCompletion.choices[0]?.message?.content || "";
    } catch (groqErr: any) {
      console.warn("Primeira tentativa com Groq falhou, tentando fallback minimalista...", groqErr?.message);
      try {
        const fallbackCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          model: 'llama-3.3-70b-versatile',
        });
        text = fallbackCompletion.choices[0]?.message?.content || "";
      } catch (fallbackErr: any) {
        throw fallbackErr;
      }
    }

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Erro no Groq:', error);
    const isRateLimit = error?.status === 413 || error?.message?.includes('TPM') || error?.message?.includes('rate_limit_exceeded');
    const userErrorMsg = isRateLimit 
      ? 'O limite temporário de requisições da IA foi atingido. Por favor, aguarde alguns instantes e tente novamente.' 
      : 'Ocorreu um erro ao processar sua resposta. Tente novamente.';
    
    return NextResponse.json({ success: false, error: userErrorMsg }, { status: isRateLimit ? 429 : 500 });
  }
}

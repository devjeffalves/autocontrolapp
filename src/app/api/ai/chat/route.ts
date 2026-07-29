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

    Object.values(weekdaySummary).forEach(w => {
      w.faturamentoTotal = Number(w.faturamentoTotal.toFixed(2));
      w.lucroTotal = Number(w.lucroTotal.toFixed(2));
      w.kmTotal = Number(w.kmTotal.toFixed(1));
      w.horasTrabalhadas = Number(w.horasTrabalhadas.toFixed(1));
      w.ganhoMedioPorHora = w.horasTrabalhadas > 0 ? Number((w.faturamentoTotal / w.horasTrabalhadas).toFixed(2)) : 0;
      w.lucroMedioPorKm = w.kmTotal > 0 ? Number((w.lucroTotal / w.kmTotal).toFixed(2)) : 0;
    });

    // Formatando valores nos resumos mensais
    Object.values(monthlySummary).forEach(m => {
      m.faturamento = Number(m.faturamento.toFixed(2));
      m.lucroLiquido = Number(m.lucroLiquido.toFixed(2));
      m.combustivelGasto = Number(m.combustivelGasto.toFixed(2));
      m.kmTotal = Number(m.kmTotal.toFixed(1));
      m.horasTrabalhadas = Number(m.horasTrabalhadas.toFixed(1));
      m.rendimentoKmL = Number(vehicleAvgConsumption.toFixed(1));
      m.lucroPorKm = m.kmTotal > 0 ? Number((m.lucroLiquido / m.kmTotal).toFixed(2)) : 0;
      m.lucroPorHora = m.horasTrabalhadas > 0 ? Number((m.lucroLiquido / m.horasTrabalhadas).toFixed(2)) : 0;
    });

    const systemPrompt = `
      Você é a "Assistente de Bordo" da Auto Control, uma parceira inteligente, especialista e encorajadora para motoristas de aplicativo.
      Seu objetivo é analisar o desempenho financeiro e operacional do motorista e responder com precisão sobre faturamento, lucro, corridas, km e rendimento.

      TONALIDADE:
      - Seja calorosa, parceira, profissional e direta.
      - Sempre formate valores monetários no padrão de moeda brasileiro (R$ XX,XX).
      - Responda sempre em Português do Brasil.
      - Use formatação Markdown (títulos, negritos e listas de marcadores) para respostas fáceis de ler no celular.

      INFORMAÇÕES DO VEÍCULO:
      - Modelo: ${vehicle?.model || 'Não cadastrado'}
      - Consumo Médio Calculado/Real: ${vehicleAvgConsumption.toFixed(1)} km/L

      RESUMO CONSOLIDADO POR MÊS DE TODO O HISTÓRICO DO MOTORISTA:
      ${JSON.stringify(Object.values(monthlySummary), null, 2)}

      RESUMO DE RENTABILIDADE POR DIA DA SEMANA (DOMINGO A SÁBADO):
      ${JSON.stringify(Object.values(weekdaySummary), null, 2)}

      REGISTROS DETALHADOS DAS CORRIDAS DO MOTORISTA:
      ${JSON.stringify(detailedRides.slice(0, 60), null, 2)}

      SUAS CAPACIDADES E INSTRUÇÕES PRINCIPAIS:
      1. SUGESTÃO DE DIAS E HORÁRIOS MAIS RENTÁVEIS:
         - Ao ser perguntado sobre quais são os melhores dias ou horários para rodar, analise os dados de 'RESUMO DE RENTABILIDADE POR DIA DA SEMANA'.
         - Identifique e indique os dias com maior Média R$/Hora (ganhoMedioPorHora) e maior faturamento.
         - Forneça um ranking claro com os melhores dias (ex: 1º Sexta-feira, 2º Sábado, etc.) explicando os valores e recomendando focar neles.
      2. DICAS PRÁTICAS DE ECONOMIA DE COMBUSTÍVEL E AUMENTO DE LUCRO:
         - Sugira práticas comprovadas para economizar combustível (manter velocidade constante entre 60-80 km/h, recalibrar pneus semanalmente, reduzir tempo do motor em marcha lenta e otimizar rotas sem rodar "vazio").
         - Oriente estratégias para elevar o Lucro por KM (R$/km) acima de R$ 2,00/km.
      3. RESUMOS MENSAIS E COMPARAÇÕES:
         - Se o motorista perguntar sobre um mês específico (Maio, Junho, Julho, etc.), dê os valores exatos de faturamento, lucro líquido, km e horas daquele mês.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content
        })),
        { role: 'user', content: message }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    const text = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Erro no Groq:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

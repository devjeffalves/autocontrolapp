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
    const isConsumptionInconsistent = globalLitres > 0 && (calculatedAvgConsumption < 6 || calculatedAvgConsumption > 22);

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
      Você é a "Assistente de Bordo" da Auto Control, uma parceira inteligente e encorajadora para motoristas de aplicativo.
      Seu objetivo é analisar o desempenho financeiro e operacional do motorista e responder com precisão a qualquer pergunta sobre seus registros de faturamento, lucro, corridas, km e rendimento (incluindo Maio, Junho, Julho e qualquer outro mês cadastrado).

      TONALIDADE:
      - Seja calorosa, parceira, profissional e direta.
      - Sempre formate valores monetários no padrão de moeda brasileiro (R$ XX,XX).
      - Responda sempre em Português do Brasil.

      INFORMAÇÕES DO VEÍCULO:
      - Modelo: ${vehicle?.model || 'Não cadastrado'}
      - Consumo Médio Calculado/Real: ${vehicleAvgConsumption.toFixed(1)} km/L

      RESUMO CONSOLIDADO POR MÊS DE TODO O HISTÓRICO DO MOTORISTA:
      ${JSON.stringify(Object.values(monthlySummary), null, 2)}

      REGISTROS DETALHADOS DAS CORRIDAS DO MOTORISTA:
      ${JSON.stringify(detailedRides.slice(0, 60), null, 2)}

      DIRETRIZES:
      1. Use os dados consolidados do resumo mensal para responder sobre qualquer mês específico (ex: Maio, Junho, etc.) ou fazer comparações entre meses.
      2. Se o motorista perguntar sobre o desempenho de um mês em específico, informe os valores exatos de faturamento, lucro líquido, km e rendimento daquele mês.
      3. Sempre motive o motorista com dicas práticas baseadas no seu rendimento (R$/km e R$/h).
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

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
    
    // Buscar contexto do usuário
    const [rides, vehicle] = await Promise.all([
      Ride.find({ status: 'closed' }).sort({ date: -1 }).limit(10),
      Vehicle.findOne({})
    ]);

    const vehicleAvgConsumption = vehicle?.avgConsumption || 10;
    let totalCost = 0;
    let totalLitres = 0;
    rides.forEach(r => {
      r.fuelings?.forEach((f: any) => {
        totalCost += (f.cost || 0);
        totalLitres += (f.litres || 0);
      });
    });
    const avgFuelPrice = totalLitres > 0 ? (totalCost / totalLitres) : 5.50;

    const statsContext = rides.map(r => {
      const kmTotal = r.kmTotal || 0;
      let rideFuelPrice = avgFuelPrice;
      const rideFuelCost = r.fuelings?.reduce((acc: number, f: any) => acc + (f.cost || 0), 0) || 0;
      const rideFuelLitres = r.fuelings?.reduce((acc: number, f: any) => acc + (f.litres || 0), 0) || 0;
      if (rideFuelLitres > 0) {
        rideFuelPrice = rideFuelCost / rideFuelLitres;
      }
      
      const fuelCostConsumed = (kmTotal / vehicleAvgConsumption) * rideFuelPrice;
      const lucro = (r.earnings || 0) - fuelCostConsumed;

      return {
        data: r.date.toLocaleDateString('pt-BR'),
        ganhos: r.earnings,
        km: kmTotal,
        lucro: Number(lucro.toFixed(2)),
        plataforma: r.platform
      };
    });

    const systemPrompt = `
      Você é a "Assistente de Bordo" da Auto Control, uma parceira amigável e encorajadora para motoristas de aplicativo.
      Seu objetivo é ajudar o motorista a lucrar mais com dicas práticas e motivadoras.
      
      TONALIDADE:
      - Seja calorosa, profissional e direta.
      - Use uma linguagem de parceria (ex: "Vamos lá!", "Bora faturar!", "Olha só essa dica").
      - Evite listas muito longas ou símbolos complexos.
      
      CONTEXTO DO MOTORISTA:
      - Veículo: ${vehicle?.model || 'Não cadastrado'}
      - Consumo Médio Esperado: ${vehicle?.avgConsumption || 0} km/L
      - Últimos 10 Registros: ${JSON.stringify(statsContext)}
      
      DIRETRIZES:
      1. Baseie seus conselhos nos dados reais fornecidos.
      2. Foque em como aumentar o lucro por KM de forma leve.
      3. Sempre responda em Português do Brasil.
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
      model: 'llama-3.1-8b-instant',
    });

    const text = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Erro no Groq:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

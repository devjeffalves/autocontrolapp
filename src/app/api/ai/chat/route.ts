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

    const statsContext = rides.map(r => ({
      data: r.date.toLocaleDateString('pt-BR'),
      ganhos: r.earnings,
      km: r.kmTotal,
      lucro: (r.earnings || 0) - (r.fuelings?.reduce((acc: number, f: any) => acc + (f.cost || 0), 0) || 0),
      plataforma: r.platform
    }));

    const systemPrompt = `
      Você é o "Assistente de Bordo" da Auto Control, uma IA especialista em rentabilidade para motoristas de aplicativo.
      Seu objetivo é analisar os dados do motorista e dar dicas práticas para aumentar o lucro e diminuir custos.
      
      CONTEXTO DO MOTORISTA:
      - Veículo: ${vehicle?.model || 'Não cadastrado'}
      - Consumo Médio Esperado: ${vehicle?.avgConsumption || 0} km/L
      - Últimos 10 Registros: ${JSON.stringify(statsContext)}
      
      DIRETRIZES:
      1. Seja direto, profissional e encorajador.
      2. Use os dados reais fornecidos para basear seus conselhos.
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

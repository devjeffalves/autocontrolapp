import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'GEMINI_API_KEY não configurada no servidor.' 
      }, { status: 500 });
    }

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
      3. Se o lucro por KM estiver baixo (abaixo de R$ 1.20), sugira estratégias.
      4. Se o consumo real estiver pior que o esperado, sugira manutenção ou mudança na forma de dirigir.
      5. Sempre responda em Português do Brasil.
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Olá! Sou seu Assistente de Bordo da Auto Control. Analisei seus dados e estou pronto para te ajudar a maximizar sua rentabilidade. Em que posso ser útil hoje?" }] },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }))
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Erro na IA:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

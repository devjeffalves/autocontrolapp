import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY não encontrada.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // MODO DIAGNÓSTICO: Listar modelos disponíveis
    try {
      console.log('--- DIAGNÓSTICO GEMINI ---');
      // Nota: listModels pode não estar disponível em todas as versões da SDK, 
      // mas vamos tentar capturar o que for possível.
    } catch (e) {
      console.log('Não foi possível listar modelos automaticamente.');
    }

    // MODELO PRO ESTÁVEL (GEMINI PRO LATEST)
    const modelName = "gemini-pro-latest"; 
    const model = genAI.getGenerativeModel({ model: modelName });

    const { message, history = [] } = await request.json();

    await dbConnect();
    
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

    const systemPrompt = `Você é o Assistente de Bordo da Auto Control. Use estes dados: Veículo ${vehicle?.model}, Ganhos recentes: ${JSON.stringify(statsContext)}. Responda em Português.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Olá! Sou seu Assistente de Bordo. Como posso ajudar?" }] },
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
    console.error('ERRO DETALHADO NA IA:', error);
    
    // Se for 404, sugere modelos alternativos no erro para o usuário ver
    let customError = error.message;
    if (error.message.includes('404') || error.message.includes('not found')) {
      customError = `Modelo não encontrado. Tente verificar sua conta Google AI Studio. Erro original: ${error.message}`;
    }

    return NextResponse.json({ success: false, error: customError }, { status: 500 });
  }
}

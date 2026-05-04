import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = {};
    if (status) {
      query = { status };
    }

    const rides = await Ride.find(query).sort({ date: -1 });
    return NextResponse.json({ success: true, data: rides });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Se estiver tentando iniciar uma nova sessão, verificar se já existe uma aberta
    if (body.action === 'start') {
      const activeSession = await Ride.findOne({ status: 'open' });
      if (activeSession) {
        return NextResponse.json({ success: false, error: 'Já existe uma sessão aberta' }, { status: 400 });
      }
      
      const ride = await Ride.create({
        kmStart: body.kmStart,
        platform: body.platform || 'Both',
        date: new Date(),
        status: 'open'
      });
      return NextResponse.json({ success: true, data: ride }, { status: 201 });
    }

    // Se estiver atualizando uma sessão aberta
    const activeSession = await Ride.findOne({ status: 'open' });
    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Nenhuma sessão aberta encontrada' }, { status: 404 });
    }

    if (body.action === 'add_fueling') {
      activeSession.fuelings.push({
        cost: body.fuelCost,
        litres: body.fuelLitres,
        date: new Date()
      });
      await activeSession.save();
      return NextResponse.json({ success: true, data: activeSession });
    }

    if (body.action === 'finish') {
      const kmEnd = body.kmEnd;
      const kmTotal = kmEnd - activeSession.kmStart;
      
      activeSession.kmEnd = kmEnd;
      activeSession.kmTotal = kmTotal;
      activeSession.rides = body.rides || 0;
      activeSession.earnings = body.earnings || 0;
      activeSession.status = 'closed';
      activeSession.platform = body.platform || activeSession.platform;
      
      await activeSession.save();

      // Atualizar o KM atual do veículo
      await Vehicle.findOneAndUpdate({}, { currentKm: kmEnd, lastUpdated: new Date() });
      
      return NextResponse.json({ success: true, data: activeSession });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

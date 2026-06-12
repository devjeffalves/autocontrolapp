import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Se estiver tentando iniciar uma nova sessão, verificar se já existe uma aberta
    if (body.action === 'start') {
      const activeSession = await Ride.findOne({ status: 'open' });
      if (activeSession) {
        return NextResponse.json({ success: false, error: 'Já existe uma sessão aberta' }, { status: 400 });
      }
      
      const startTimeVal = body.startTime ? new Date(body.startTime) : new Date();
      const ride = await Ride.create({
        kmStart: body.kmStart,
        platform: body.platform || 'Aplicativos',
        date: startTimeVal,
        startTime: startTimeVal,
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
      const fuelKmNum = body.fuelKm ? Number(body.fuelKm) : undefined;
      activeSession.fuelings.push({
        cost: Number(body.fuelCost),
        litres: Number(body.fuelLitres),
        km: fuelKmNum,
        date: new Date()
      });
      await activeSession.save();

      // Atualizar o KM do veículo se o KM informado for maior
      if (fuelKmNum) {
        await Vehicle.findOneAndUpdate(
          { currentKm: { $lt: fuelKmNum } },
          { currentKm: fuelKmNum, lastUpdated: new Date() }
        );
      }

      return NextResponse.json({ success: true, data: activeSession });
    }

    if (body.action === 'finish') {
      const kmEnd = body.kmEnd;
      const kmTotal = kmEnd - activeSession.kmStart;
      const endTimeVal = body.endTime ? new Date(body.endTime) : new Date();
      
      activeSession.kmEnd = kmEnd;
      activeSession.kmTotal = kmTotal;
      activeSession.rides = body.rides || 0;
      activeSession.earnings = body.earnings || 0;
      activeSession.status = 'closed';
      activeSession.platform = body.platform || activeSession.platform;
      activeSession.endTime = endTimeVal;
      
      // se startTime não foi preenchido anteriormente por alguma razão
      if (!activeSession.startTime) {
        activeSession.startTime = activeSession.date || new Date();
      }
      
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

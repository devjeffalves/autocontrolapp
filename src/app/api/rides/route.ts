import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

// Helper para parse seguro de datas enviadas pelo cliente
function parseDateInput(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query: any = {};
    if (status === 'open') {
      // Buscar sessão ativa (aberta ou em pausa)
      query = { status: { $in: ['open', 'paused'] } };
    } else if (status) {
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
    
    // 1. Abastecimento Avulso (sem necessidade de turno aberto)
    if (body.action === 'standalone_fueling') {
      const fuelCost = Number(body.fuelCost);
      const fuelLitres = Number(body.fuelLitres);
      const vehicle = await Vehicle.findOne();
      const fuelKmNum = body.fuelKm ? Number(body.fuelKm) : (vehicle?.currentKm || 0);
      const fuelingDate = body.date ? parseDateInput(body.date) : new Date();

      const ride = await Ride.create({
        platform: 'Aplicativos',
        rides: 0,
        earnings: 0,
        kmStart: fuelKmNum,
        kmEnd: fuelKmNum,
        kmTotal: 0,
        fuelings: [{
          cost: fuelCost,
          litres: fuelLitres,
          date: fuelingDate,
          km: fuelKmNum
        }],
        status: 'closed',
        date: fuelingDate,
        startTime: fuelingDate,
        endTime: fuelingDate
      });

      // Atualizar KM do veículo se informado KM maior
      if (fuelKmNum > 0) {
        await Vehicle.findOneAndUpdate(
          { currentKm: { $lt: fuelKmNum } },
          { currentKm: fuelKmNum, lastUpdated: new Date() }
        );
      }

      return NextResponse.json({ success: true, data: ride }, { status: 201 });
    }

    // 2. Iniciar Turno
    if (body.action === 'start') {
      const activeSession = await Ride.findOne({ status: { $in: ['open', 'paused'] } });
      if (activeSession) {
        return NextResponse.json({ success: false, error: 'Já existe uma sessão ativa (aberta ou em pausa)' }, { status: 400 });
      }
      
      const startTimeVal = parseDateInput(body.startTime);
      const ride = await Ride.create({
        kmStart: body.kmStart,
        platform: body.platform || 'Aplicativos',
        date: startTimeVal,
        startTime: startTimeVal,
        status: 'open'
      });
      return NextResponse.json({ success: true, data: ride }, { status: 201 });
    }

    // Buscar sessão ativa (aberta ou em pausa)
    const activeSession = await Ride.findOne({ status: { $in: ['open', 'paused'] } });
    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Nenhuma sessão ativa encontrada' }, { status: 404 });
    }

    // 3. Pausar Turno
    if (body.action === 'pause') {
      if (activeSession.status === 'paused') {
        return NextResponse.json({ success: false, error: 'Turno já está em pausa' }, { status: 400 });
      }
      activeSession.status = 'paused';
      activeSession.pauses = activeSession.pauses || [];
      activeSession.pauses.push({ startTime: new Date() });
      await activeSession.save();
      return NextResponse.json({ success: true, data: activeSession });
    }

    // 4. Retomar Turno
    if (body.action === 'resume') {
      if (activeSession.status !== 'paused') {
        return NextResponse.json({ success: false, error: 'Turno não está em pausa' }, { status: 400 });
      }
      activeSession.status = 'open';
      if (activeSession.pauses && activeSession.pauses.length > 0) {
        const lastPause = activeSession.pauses[activeSession.pauses.length - 1];
        if (!lastPause.endTime) {
          lastPause.endTime = new Date();
        }
      }
      await activeSession.save();
      return NextResponse.json({ success: true, data: activeSession });
    }

    // 5. Adicionar Abastecimento ao turno
    if (body.action === 'add_fueling') {
      const fuelKmNum = body.fuelKm ? Number(body.fuelKm) : undefined;
      const fuelingDate = body.date ? parseDateInput(body.date) : new Date();

      activeSession.fuelings.push({
        cost: Number(body.fuelCost),
        litres: Number(body.fuelLitres),
        km: fuelKmNum,
        date: fuelingDate
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

    // 6. Finalizar Turno
    if (body.action === 'finish') {
      const kmEnd = body.kmEnd;
      const kmTotal = kmEnd - activeSession.kmStart;
      const endTimeVal = parseDateInput(body.endTime);
      
      // Se estava em pausa ao fechar, fecha a última pausa
      if (activeSession.status === 'paused' && activeSession.pauses && activeSession.pauses.length > 0) {
        const lastPause = activeSession.pauses[activeSession.pauses.length - 1];
        if (!lastPause.endTime) {
          lastPause.endTime = endTimeVal;
        }
      }

      activeSession.kmEnd = kmEnd;
      activeSession.kmTotal = kmTotal;
      activeSession.rides = body.rides || 0;
      activeSession.earnings = body.earnings || 0;
      activeSession.status = 'closed';
      activeSession.platform = body.platform || activeSession.platform;
      activeSession.endTime = endTimeVal;
      
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

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';
import { localInputValueToDate } from '@/lib/dateUtils';

// Helper para parse seguro de datas enviadas pelo cliente sem deslocamento fuso horário
function parseDateInput(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  return localInputValueToDate(dateInput);
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

    const rides = await Ride.find(query).sort({ date: -1 }).lean();
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
      const vehicle = (await Vehicle.findOne({ isActive: true })) || (await Vehicle.findOne({}));
      const fuelKmNum = body.fuelKm ? Number(body.fuelKm) : (vehicle?.currentKm || 0);
      const fuelingDate = body.date ? parseDateInput(body.date) : new Date();

      const ride = await Ride.create({
        platform: 'Aplicativos',
        rides: 0,
        earnings: 0,
        kmStart: fuelKmNum,
        kmEnd: fuelKmNum,
        kmTotal: 0,
        vehicleId: vehicle?._id?.toString(),
        vehiclePlate: vehicle?.plate,
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

      // Atualizar KM do veículo ativo e desativar reserva se informado
      const updateData: any = { reserveActive: false, reserveStartKm: 0, lastUpdated: new Date() };
      if (vehicle) {
        if (fuelKmNum > 0) {
          await Vehicle.findByIdAndUpdate(vehicle._id, { ...updateData, $max: { currentKm: fuelKmNum } });
        } else {
          await Vehicle.findByIdAndUpdate(vehicle._id, updateData);
        }
      }

      return NextResponse.json({ success: true, data: ride }, { status: 201 });
    }

    // 2. Iniciar Turno
    if (body.action === 'start') {
      const activeSession = await Ride.findOne({ status: { $in: ['open', 'paused'] } });
      if (activeSession) {
        return NextResponse.json({ success: false, error: 'Já existe uma sessão ativa (aberta ou em pausa)' }, { status: 400 });
      }
      
      const newKmStart = Number(body.kmStart);
      const startTimeVal = parseDateInput(body.startTime);
      const activeVehicle = (await Vehicle.findOne({ isActive: true })) || (await Vehicle.findOne({}));

      // Se houver diferença de KM em relação ao último turno fechado e autoLogPersonalGap for true
      if (body.autoLogPersonalGap !== false && activeVehicle) {
        const lastClosedRide = await Ride.findOne({
          status: 'closed',
          $or: [{ vehicleId: activeVehicle._id.toString() }, { vehiclePlate: activeVehicle.plate }]
        }).sort({ kmEnd: -1, kmStart: -1, date: -1, createdAt: -1 });

        let lastKm = 0;
        if (lastClosedRide) {
          lastKm = lastClosedRide.kmEnd || lastClosedRide.kmStart || 0;
        }
        if (activeVehicle.currentKm && activeVehicle.currentKm > lastKm) {
          lastKm = activeVehicle.currentKm;
        }

        if (lastKm > 0 && newKmStart > lastKm) {
          const gapKm = newKmStart - lastKm;
          await Ride.create({
            platform: 'Passeio',
            rides: 0,
            earnings: 0,
            kmStart: lastKm,
            kmEnd: newKmStart,
            kmTotal: gapKm,
            vehicleId: activeVehicle._id.toString(),
            vehiclePlate: activeVehicle.plate,
            status: 'closed',
            date: startTimeVal,
            startTime: startTimeVal,
            endTime: startTimeVal
          });
        }
      }

      const ride = await Ride.create({
        kmStart: newKmStart,
        platform: body.platform || 'Aplicativos',
        vehicleId: activeVehicle?._id?.toString(),
        vehiclePlate: activeVehicle?.plate,
        date: startTimeVal,
        startTime: startTimeVal,
        status: 'open'
      });

      // Atualizar KM do veículo ativo com o odômetro inicial do turno
      if (activeVehicle && newKmStart > 0) {
        await Vehicle.findByIdAndUpdate(activeVehicle._id, {
          $max: { currentKm: newKmStart },
          lastUpdated: new Date()
        });
      }

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
      const activeVehicle = (await Vehicle.findOne({ isActive: true })) || (await Vehicle.findOne({}));
      const fuelKmNum = body.fuelKm ? Number(body.fuelKm) : (activeSession.kmEnd || activeSession.kmStart || activeVehicle?.currentKm || 0);
      const fuelingDate = body.date ? parseDateInput(body.date) : new Date();

      activeSession.fuelings.push({
        cost: Number(body.fuelCost),
        litres: Number(body.fuelLitres),
        km: fuelKmNum > 0 ? fuelKmNum : undefined,
        date: fuelingDate
      });
      await activeSession.save();

      // Atualizar o KM do veículo ativo e desativar reserva
      const updateData: any = { reserveActive: false, reserveStartKm: 0, lastUpdated: new Date() };
      if (activeVehicle) {
        if (fuelKmNum > 0) {
          await Vehicle.findByIdAndUpdate(activeVehicle._id, { ...updateData, $max: { currentKm: fuelKmNum } });
        } else {
          await Vehicle.findByIdAndUpdate(activeVehicle._id, updateData);
        }
      }

      return NextResponse.json({ success: true, data: activeSession });
    }

    // 6. Finalizar Turno
    if (body.action === 'finish') {
      const kmEnd = body.kmEnd;
      const kmTotal = kmEnd - activeSession.kmStart;
      let endTimeVal = (body.endTime && String(body.endTime).trim()) ? parseDateInput(body.endTime) : new Date();
      
      const sessionStart = activeSession.startTime ? new Date(activeSession.startTime) : (activeSession.date ? new Date(activeSession.date) : new Date());
      if (isNaN(endTimeVal.getTime()) || endTimeVal.getTime() <= sessionStart.getTime()) {
        endTimeVal = new Date();
      }
      
      if (activeSession.pauses && activeSession.pauses.length > 0) {
        activeSession.pauses.forEach((p: any) => {
          if (!p.endTime || new Date(p.endTime).getTime() > endTimeVal.getTime()) {
            p.endTime = endTimeVal;
          }
        });
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

      // Atualizar o KM atual do veículo ativo correspondente
      if (activeSession.vehicleId) {
        await Vehicle.findByIdAndUpdate(activeSession.vehicleId, { currentKm: kmEnd, lastUpdated: new Date() });
      } else {
        await Vehicle.findOneAndUpdate({ isActive: true }, { currentKm: kmEnd, lastUpdated: new Date() });
      }
      
      return NextResponse.json({ success: true, data: activeSession });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

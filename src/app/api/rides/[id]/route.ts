import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';
import { localInputValueToDate } from '@/lib/dateUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = await params;

    // Remover campos imutáveis do MongoDB para evitar erro no findByIdAndUpdate
    delete body._id;
    delete body.id;
    delete body.__v;
    delete body.createdAt;
    delete body.updatedAt;

    if (body.startTime) body.startTime = localInputValueToDate(body.startTime);
    if (body.endTime) body.endTime = localInputValueToDate(body.endTime);
    if (body.date) body.date = localInputValueToDate(body.date || body.startTime);

    // Recalcular kmTotal
    if (body.kmEnd !== undefined && body.kmStart !== undefined) {
      body.kmTotal = Math.max(0, Number(body.kmEnd) - Number(body.kmStart));
    } else if (body.kmEnd !== undefined) {
      const ride = await Ride.findById(id);
      if (ride) {
        body.kmTotal = Math.max(0, Number(body.kmEnd) - Number(ride.kmStart));
      }
    }

    const updatedRide = await Ride.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedRide) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    // Sincronizar/Recalcular KM do veículo com base na última corrida deste veículo específico
    const targetVehicle = (updatedRide?.vehicleId ? await Vehicle.findById(updatedRide.vehicleId) : null)
      || (await Vehicle.findOne({ isActive: true }))
      || (await Vehicle.findOne({}));

    if (targetVehicle) {
      const vehicleFilter = {
        $or: [
          { vehicleId: targetVehicle._id.toString() },
          { vehiclePlate: targetVehicle.plate }
        ]
      };
      const latestClosedRide = await Ride.findOne({
        status: 'closed',
        ...vehicleFilter
      }).sort({ date: -1, createdAt: -1 });

      if (latestClosedRide) {
        const latestKm = latestClosedRide.kmEnd || latestClosedRide.kmStart || 0;
        if (latestKm > 0) {
          targetVehicle.currentKm = latestKm;
          targetVehicle.lastUpdated = new Date();
          await targetVehicle.save();
        }
      }
    }

    return NextResponse.json({ success: true, data: updatedRide });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const deletedRide = await Ride.findByIdAndDelete(id);

    if (!deletedRide) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    // Recalcular e atualizar o KM atual do veículo com base na última corrida restante deste veículo
    const targetVehicle = (deletedRide?.vehicleId ? await Vehicle.findById(deletedRide.vehicleId) : null)
      || (await Vehicle.findOne({ isActive: true }))
      || (await Vehicle.findOne({}));

    if (targetVehicle) {
      const vehicleFilter = {
        $or: [
          { vehicleId: targetVehicle._id.toString() },
          { vehiclePlate: targetVehicle.plate }
        ]
      };
      const latestClosedRide = await Ride.findOne({
        status: 'closed',
        ...vehicleFilter
      }).sort({ date: -1, createdAt: -1 });

      const latestKm = latestClosedRide ? (latestClosedRide.kmEnd || latestClosedRide.kmStart || 0) : 0;
      targetVehicle.currentKm = latestKm;
      targetVehicle.lastUpdated = new Date();
      await targetVehicle.save();
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Ride from '@/models/Ride';

export async function GET() {
  try {
    await dbConnect();
    let vehicles = await Vehicle.find({}).sort({ createdAt: -1 });

    if (vehicles.length === 0) {
      return NextResponse.json({ success: true, data: null, vehicles: [] });
    }

    let activeVehicle = vehicles.find((v) => v.isActive);

    // Se nenhum veículo estiver marcado como ativo, marca o primeiro como ativo
    if (!activeVehicle) {
      vehicles[0].isActive = true;
      await vehicles[0].save();
      activeVehicle = vehicles[0];
    }

    // Sincronizar KM atual do veículo ativo com o maior KM do sistema
    if (activeVehicle) {
      const maxKmEndRide = await Ride.findOne({ kmEnd: { $exists: true, $ne: null } }).sort({ kmEnd: -1 });
      const maxKmStartRide = await Ride.findOne({ kmStart: { $exists: true, $ne: null } }).sort({ kmStart: -1 });

      const maxKmEnd = maxKmEndRide ? (maxKmEndRide.kmEnd || 0) : 0;
      const maxKmStart = maxKmStartRide ? (maxKmStartRide.kmStart || 0) : 0;
      const systemMaxKm = Math.max(maxKmEnd, maxKmStart);

      if (systemMaxKm > activeVehicle.currentKm) {
        activeVehicle.currentKm = systemMaxKm;
        activeVehicle.lastUpdated = new Date();
        await activeVehicle.save();
      }
    }

    return NextResponse.json({ success: true, data: activeVehicle, vehicles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // 1. Ação de Selecionar Veículo de Trabalho Ativo
    if (body.action === 'select' && body.vehicleId) {
      await Vehicle.updateMany({}, { isActive: false });
      const activeVehicle = await Vehicle.findByIdAndUpdate(
        body.vehicleId,
        { isActive: true, lastUpdated: new Date() },
        { new: true }
      );
      const allVehicles = await Vehicle.find({}).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, data: activeVehicle, vehicles: allVehicles });
    }

    // 2. Ação de Deletar Veículo
    if (body.action === 'delete' && body.vehicleId) {
      const deletedVehicle = await Vehicle.findByIdAndDelete(body.vehicleId);
      const remainingVehicles = await Vehicle.find({}).sort({ createdAt: -1 });

      let activeVehicle = remainingVehicles.find((v) => v.isActive);
      if (remainingVehicles.length > 0 && (!activeVehicle || deletedVehicle?.isActive)) {
        remainingVehicles[0].isActive = true;
        await remainingVehicles[0].save();
        activeVehicle = remainingVehicles[0];
      }

      return NextResponse.json({
        success: true,
        data: activeVehicle || null,
        vehicles: remainingVehicles,
      });
    }

    // 3. Salvar / Atualizar / Criar Veículo
    body.lastUpdated = new Date();
    const vehicleCount = await Vehicle.countDocuments({});

    let savedVehicle;

    if (body._id) {
      // Atualizar existente
      if (body.isActive) {
        await Vehicle.updateMany({ _id: { $ne: body._id } }, { isActive: false });
      }
      savedVehicle = await Vehicle.findByIdAndUpdate(body._id, body, {
        new: true,
        runValidators: true,
      });
    } else {
      // Criar novo veículo
      // Se for o primeiro veículo do sistema ou body.isActive for true, torna este o ativo
      const shouldBeActive = vehicleCount === 0 || !!body.isActive;
      if (shouldBeActive) {
        await Vehicle.updateMany({}, { isActive: false });
      }
      body.isActive = shouldBeActive;
      savedVehicle = await Vehicle.create(body);
    }

    const allVehicles = await Vehicle.find({}).sort({ createdAt: -1 });
    const currentActive = allVehicles.find((v) => v.isActive) || savedVehicle;

    return NextResponse.json({ success: true, data: currentActive, vehicles: allVehicles });
  } catch (error: any) {
    console.error('Erro na API de veículo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'ID do veículo não informado' }, { status: 400 });
    }

    const deletedVehicle = await Vehicle.findByIdAndDelete(vehicleId);
    const remainingVehicles = await Vehicle.find({}).sort({ createdAt: -1 });

    let activeVehicle = remainingVehicles.find((v) => v.isActive);
    if (remainingVehicles.length > 0 && (!activeVehicle || deletedVehicle?.isActive)) {
      remainingVehicles[0].isActive = true;
      await remainingVehicles[0].save();
      activeVehicle = remainingVehicles[0];
    }

    return NextResponse.json({
      success: true,
      data: activeVehicle || null,
      vehicles: remainingVehicles,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


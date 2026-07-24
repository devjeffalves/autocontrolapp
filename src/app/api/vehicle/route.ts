import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Ride from '@/models/Ride';

export async function GET() {
  try {
    await dbConnect();
    let vehicle = await Vehicle.findOne({});
    
    if (vehicle) {
      // Sincronizar o KM atual do veículo com o KM final do último turno cadastrado
      const latestRide = await Ride.findOne({}).sort({ endTime: -1, date: -1 });
      if (latestRide) {
        const latestRideKm = latestRide.kmEnd || latestRide.kmStart;
        if (latestRideKm && latestRideKm > 0 && vehicle.currentKm !== latestRideKm) {
          vehicle.currentKm = latestRideKm;
          vehicle.lastUpdated = new Date();
          await vehicle.save();
        }
      }
    }

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Update or create
    const vehicle = await Vehicle.findOneAndUpdate({}, body, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    
    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

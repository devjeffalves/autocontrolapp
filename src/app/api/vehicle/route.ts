import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Ride from '@/models/Ride';

export async function GET() {
  try {
    await dbConnect();
    let vehicle = await Vehicle.findOne({});
    
    if (vehicle) {
      // Sincronizar o KM atual com o maior valor entre todos os kmEnd e kmStart no sistema (se superior)
      const maxKmEndRide = await Ride.findOne({ kmEnd: { $exists: true, $ne: null } }).sort({ kmEnd: -1 });
      const maxKmStartRide = await Ride.findOne({ kmStart: { $exists: true, $ne: null } }).sort({ kmStart: -1 });
      
      const maxKmEnd = maxKmEndRide ? (maxKmEndRide.kmEnd || 0) : 0;
      const maxKmStart = maxKmStartRide ? (maxKmStartRide.kmStart || 0) : 0;
      const systemMaxKm = Math.max(maxKmEnd, maxKmStart);

      if (systemMaxKm > vehicle.currentKm) {
        vehicle.currentKm = systemMaxKm;
        vehicle.lastUpdated = new Date();
        await vehicle.save();
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

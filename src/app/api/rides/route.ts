import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';
import Vehicle from '@/models/Vehicle';

export async function GET() {
  try {
    await dbConnect();
    const rides = await Ride.find({}).sort({ date: -1 });
    return NextResponse.json({ success: true, data: rides });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Calcular KM Total se não for enviado
    const kmTotal = body.kmEnd - body.kmStart;
    
    const ride = await Ride.create({
      ...body,
      kmTotal
    });

    // Atualizar o KM atual do veículo
    await Vehicle.findOneAndUpdate({}, { currentKm: body.kmEnd, lastUpdated: new Date() });
    
    return NextResponse.json({ success: true, data: ride }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

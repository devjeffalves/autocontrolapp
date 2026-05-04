import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ride from '@/models/Ride';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = params;

    // Se estiver atualizando kmEnd, recalcular kmTotal
    if (body.kmEnd !== undefined && body.kmStart !== undefined) {
      body.kmTotal = body.kmEnd - body.kmStart;
    } else if (body.kmEnd !== undefined) {
      const ride = await Ride.findById(id);
      if (ride) {
        body.kmTotal = body.kmEnd - ride.kmStart;
      }
    }

    const updatedRide = await Ride.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedRide) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedRide });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    const deletedRide = await Ride.findByIdAndDelete(id);

    if (!deletedRide) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

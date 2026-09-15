import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostConfig from '@/models/CostConfig';

export async function GET() {
  try {
    await dbConnect();
    let config = await CostConfig.findOne({});
    if (!config) {
      config = await CostConfig.create({
        rentalCompany: 'Outra',
        rentalCost: 0,
        rentalPeriod: 'Mês',
        otherMonthlyCosts: 0,
        fuelType: 'Gasolina',
        fuelPrice: 5.89,
        avgConsumption: 12.0,
        workingDaysPerMonth: 24,
        workingHoursPerDay: 10,
        dailyKmTarget: 180,
        targetGrossRevenue: 8000,
        lastUpdated: new Date()
      });
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    body.lastUpdated = new Date();

    const config = await CostConfig.findOneAndUpdate({}, body, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}

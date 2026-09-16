import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostConfig from '@/models/CostConfig';
import { evaluateRideOffer, RideOfferInput } from '@/lib/rideEvaluator';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    let offer: RideOfferInput = {
      price: Number(body.price) || 0,
      distanceKm: Number(body.distanceKm) || 0,
      timeMinutes: Number(body.timeMinutes) || 0,
    };

    // Suporte para parsing de texto livre ou extração de string
    if ((!offer.price || !offer.distanceKm) && body.text) {
      const text = String(body.text).toLowerCase().replace(',', '.');
      
      // Tentar extrair preço (ex: R$ 25.50 ou 25.50 reais)
      const priceMatch = text.match(/(?:r\$\s*|reais\s*)?(\d+(?:\.\d{1,2})?)/);
      if (priceMatch) offer.price = parseFloat(priceMatch[1]);

      // Tentar extrair km (ex: 8.5 km ou 8,5km)
      const kmMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*km/);
      if (kmMatch) offer.distanceKm = parseFloat(kmMatch[1]);

      // Tentar extrair minutos (ex: 15 min ou 15 minutos)
      const minMatch = text.match(/(\d+)\s*(?:min|minutos|m)/);
      if (minMatch) offer.timeMinutes = parseInt(minMatch[1], 10);
    }

    if (!offer.price || offer.price <= 0 || !offer.distanceKm || offer.distanceKm <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Informe um valor R$ e uma distância KM válidos para avaliação.'
      }, { status: 400 });
    }

    // Carregar configurações salvas no banco
    let config = await CostConfig.findOne({});
    if (!config) {
      config = {
        rentalCompany: 'Outra',
        rentalCost: 0,
        rentalPeriod: 'Mês',
        otherMonthlyCosts: 0,
        fuelType: 'Gasolina',
        fuelPrice: 5.89,
        avgConsumption: 15.0,
        workingDaysPerMonth: 24,
        workingHoursPerDay: 10,
        dailyKmTarget: 180,
        targetGrossRevenue: 8000,
      };
    }

    const evaluation = evaluateRideOffer(offer, config);

    return NextResponse.json({
      success: true,
      data: evaluation
    });

  } catch (error: any) {
    console.error('Erro na API de avaliação de corrida:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao avaliar corrida.'
    }, { status: 500 });
  }
}

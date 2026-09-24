import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostConfig from '@/models/CostConfig';
import { evaluateRideOffer, RideOfferInput } from '@/lib/rideEvaluator';

function parseRideText(rawText: string): RideOfferInput {
  const text = rawText.toLowerCase().replace(/,/g, '.');
  let price = 0;
  let distanceKm = 0;
  let timeMinutes = 0;

  // 1. Extrair Preço R$
  const priceRegexes = [
    /r\$\s*(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)\s*(?:reais|r\$)/,
    /valor:?\s*r?\$\s*(\d+(?:\.\d{1,2})?)/,
    /preço:?\s*r?\$\s*(\d+(?:\.\d{1,2})?)/,
  ];

  for (const regex of priceRegexes) {
    const match = text.match(regex);
    if (match) {
      price = parseFloat(match[1]);
      break;
    }
  }

  // 2. Extrair Distância KM
  const kmMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*km\b/);
  if (kmMatch) {
    distanceKm = parseFloat(kmMatch[1]);
  }

  // 3. Extrair Tempo Minutos / Horas
  const minMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:minutos|min)\b/);
  const hourMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:horas|hora|h)\b/);

  if (minMatch) {
    timeMinutes = Math.round(parseFloat(minMatch[1]));
  } else if (hourMatch) {
    timeMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  }

  // Fallback: se o preço ainda não foi encontrado por marcação explícita, encontrar números desmarcados
  if (!price) {
    // Encontrar todos os números e suas posições
    const tokens = Array.from(text.matchAll(/(\d+(?:\.\d{1,2})?)/g));
    for (const token of tokens) {
      const val = parseFloat(token[1]);
      const index = token.index ?? 0;
      const afterStr = text.slice(index + token[0].length, index + token[0].length + 10).trim();
      // Se não for seguido por km, min, minutos, h, horas
      if (!afterStr.startsWith('km') && !afterStr.startsWith('min') && !afterStr.startsWith('h')) {
        if (val !== distanceKm && val !== timeMinutes) {
          price = val;
          break;
        }
      }
    }
  }

  return { price, distanceKm, timeMinutes };
}

async function handleEvaluate(offerInput: RideOfferInput, freeText?: string) {
  await dbConnect();

  let offer = { ...offerInput };

  if ((!offer.price || !offer.distanceKm) && freeText) {
    const parsed = parseRideText(freeText);
    if (!offer.price) offer.price = parsed.price;
    if (!offer.distanceKm) offer.distanceKm = parsed.distanceKm;
    if (!offer.timeMinutes) offer.timeMinutes = parsed.timeMinutes;
  }

  if (!offer.price || offer.price <= 0 || !offer.distanceKm || offer.distanceKm <= 0) {
    return NextResponse.json({
      success: false,
      error: 'Informe um valor em R$ e uma distância em KM válidos para a avaliação.'
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const offer: RideOfferInput = {
      price: Number(body.price) || 0,
      distanceKm: Number(body.distanceKm) || 0,
      timeMinutes: Number(body.timeMinutes) || 0,
    };
    return await handleEvaluate(offer, body.text);
  } catch (error: any) {
    console.error('Erro na API de avaliação de corrida (POST):', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao avaliar corrida.'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const price = Number(searchParams.get('price')) || 0;
    const distanceKm = Number(searchParams.get('distanceKm')) || 0;
    const timeMinutes = Number(searchParams.get('timeMinutes')) || 0;
    const text = searchParams.get('text') || undefined;

    return await handleEvaluate({ price, distanceKm, timeMinutes }, text);
  } catch (error: any) {
    console.error('Erro na API de avaliação de corrida (GET):', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao avaliar corrida.'
    }, { status: 500 });
  }
}


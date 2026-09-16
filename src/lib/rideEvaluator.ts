export interface RideOfferInput {
  price: number; // Valor R$ da corrida
  distanceKm: number; // Distância total (embarque + viagem) em KM
  timeMinutes: number; // Tempo total (embarque + viagem) em minutos
}

export interface RideEvaluationResult {
  status: 'good' | 'medium' | 'bad';
  badge: '🟢 BOA' | '🟡 MEDIANA' | '🔴 RUIM';
  color: string;
  price: number;
  distanceKm: number;
  timeMinutes: number;
  ratePerKm: number;
  ratePerHour: number;
  netRatePerHour: number;
  fuelCost: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
  targetRatePerKm: number;
  targetRatePerHour: number;
  minCostPerKm: number;
  summary: string;
  reasons: string[];
}

export function evaluateRideOffer(
  offer: RideOfferInput,
  config: {
    rentalCost?: number;
    rentalPeriod?: 'Mês' | 'Semana' | string;
    otherMonthlyCosts?: number;
    fuelPrice?: number;
    avgConsumption?: number;
    workingDaysPerMonth?: number;
    workingHoursPerDay?: number;
    dailyKmTarget?: number;
    targetGrossRevenue?: number;
  }
): RideEvaluationResult {
  const price = Math.max(0, Number(offer.price) || 0);
  const distanceKm = Math.max(0.1, Number(offer.distanceKm) || 0.1);
  const timeMinutes = Math.max(1, Number(offer.timeMinutes) || 1);

  // Defaults
  const daysPerMonth = Math.max(1, config.workingDaysPerMonth || 24);
  const hoursPerDay = Math.max(1, config.workingHoursPerDay || 10);
  const dailyKm = Math.max(1, config.dailyKmTarget || 180);
  const targetGrossRevenue = config.targetGrossRevenue || 8000;
  const fuelPrice = config.fuelPrice || 5.89;
  const avgConsumption = config.avgConsumption || 15.0;

  const monthlyKm = daysPerMonth * dailyKm;
  const monthlyHours = daysPerMonth * hoursPerDay;

  // Rental & Fixed costs
  let monthlyRental = config.rentalCost || 0;
  if (config.rentalPeriod === 'Semana') {
    monthlyRental = monthlyRental * (daysPerMonth / 6);
  }
  const otherCosts = config.otherMonthlyCosts || 0;
  const fixedMonthlyCosts = monthlyRental + otherCosts;

  const fixedCostPerKm = monthlyKm > 0 ? fixedMonthlyCosts / monthlyKm : 0;
  const fuelCostPerKm = avgConsumption > 0 ? fuelPrice / avgConsumption : 0;
  const minCostPerKm = fuelCostPerKm + fixedCostPerKm;

  // Targets
  const targetRatePerKm = monthlyKm > 0 ? targetGrossRevenue / monthlyKm : 2.50;
  const targetRatePerHour = monthlyHours > 0 ? targetGrossRevenue / monthlyHours : 45.00;

  // Offer Metrics
  const totalFuelCost = distanceKm * fuelCostPerKm;
  const totalFixedCost = distanceKm * fixedCostPerKm;
  const totalCost = totalFuelCost + totalFixedCost;
  const netProfit = price - totalCost;

  const ratePerKm = price / distanceKm;
  const ratePerHour = (price / timeMinutes) * 60;
  const netRatePerHour = (netProfit / timeMinutes) * 60;
  const profitMarginPercent = price > 0 ? (netProfit / price) * 100 : 0;

  // Status Evaluation
  let status: 'good' | 'medium' | 'bad' = 'bad';
  let badge: '🟢 BOA' | '🟡 MEDIANA' | '🔴 RUIM' = '🔴 RUIM';
  let color = '#ef4444'; // red

  const meetsKmTarget = ratePerKm >= targetRatePerKm;
  const meetsHourTarget = ratePerHour >= targetRatePerHour;
  const coversMinCost = ratePerKm >= minCostPerKm;

  if (meetsKmTarget && meetsHourTarget && netProfit > 0) {
    status = 'good';
    badge = '🟢 BOA';
    color = '#10b981'; // green
  } else if (coversMinCost && (meetsKmTarget || meetsHourTarget || netProfit > 0)) {
    status = 'medium';
    badge = '🟡 MEDIANA';
    color = '#f59e0b'; // yellow
  } else {
    status = 'bad';
    badge = '🔴 RUIM';
    color = '#ef4444'; // red
  }

  // Summary & Reasons
  const reasons: string[] = [];
  reasons.push(`Ganho/KM: R$ ${ratePerKm.toFixed(2).replace('.', ',')} (Meta: R$ ${targetRatePerKm.toFixed(2).replace('.', ',')})`);
  reasons.push(`Ganho/Hora: R$ ${ratePerHour.toFixed(0)}/h (Meta: R$ ${targetRatePerHour.toFixed(0)}/h)`);
  reasons.push(`Lucro Líquido: R$ ${netProfit.toFixed(2).replace('.', ',')} (Combustível: R$ ${totalFuelCost.toFixed(2).replace('.', ',')})`);

  let summary = '';
  if (status === 'good') {
    summary = `Excelente corrida! Rentabilidade de R$ ${ratePerKm.toFixed(2)}/km e R$ ${ratePerHour.toFixed(0)}/h superam suas metas.`;
  } else if (status === 'medium') {
    summary = `Corrida aceitável. Cobre o custo operacional (R$ ${minCostPerKm.toFixed(2)}/km), mas fica no limite das metas.`;
  } else {
    summary = `Atenção: Corrida desvantajosa. Ganho de R$ ${ratePerKm.toFixed(2)}/km está próximo ou abaixo do seu custo mínimo por KM (R$ ${minCostPerKm.toFixed(2)}/km).`;
  }

  return {
    status,
    badge,
    color,
    price,
    distanceKm,
    timeMinutes,
    ratePerKm: parseFloat(ratePerKm.toFixed(2)),
    ratePerHour: parseFloat(ratePerHour.toFixed(2)),
    netRatePerHour: parseFloat(netRatePerHour.toFixed(2)),
    fuelCost: parseFloat(totalFuelCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    profitMarginPercent: parseFloat(profitMarginPercent.toFixed(1)),
    targetRatePerKm: parseFloat(targetRatePerKm.toFixed(2)),
    targetRatePerHour: parseFloat(targetRatePerHour.toFixed(2)),
    minCostPerKm: parseFloat(minCostPerKm.toFixed(2)),
    summary,
    reasons
  };
}

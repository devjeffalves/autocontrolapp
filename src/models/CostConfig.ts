import mongoose, { Schema, Document } from 'mongoose';

export interface ICostConfig extends Document {
  rentalCompany: string; // 'Kovi' | 'Movida' | 'Unidas' | 'Zencar' | 'Outra' | 'Próprio'
  rentalCost: number;
  rentalPeriod: 'Mês' | 'Semana';
  otherMonthlyCosts: number;
  fuelType: string; // 'Gasolina' | 'Etanol' | 'GNV' | 'Diesel' | 'Elétrico'
  fuelPrice: number;
  avgConsumption: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  dailyKmTarget: number;
  targetGrossRevenue: number;
  lastUpdated: Date;
}

const CostConfigSchema: Schema = new Schema({
  rentalCompany: { type: String, default: 'Outra' },
  rentalCost: { type: Number, default: 0 },
  rentalPeriod: { type: String, enum: ['Mês', 'Semana'], default: 'Mês' },
  otherMonthlyCosts: { type: Number, default: 0 },
  fuelType: { type: String, default: 'Gasolina' },
  fuelPrice: { type: Number, default: 5.89 },
  avgConsumption: { type: Number, default: 12.0 },
  workingDaysPerMonth: { type: Number, default: 24 },
  workingHoursPerDay: { type: Number, default: 10 },
  dailyKmTarget: { type: Number, default: 180 },
  targetGrossRevenue: { type: Number, default: 8000 },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.models.CostConfig || mongoose.model<ICostConfig>('CostConfig', CostConfigSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IRide extends Document {
  platform: 'Uber' | '99';
  rides: number;
  kmStart: number;
  kmEnd: number;
  kmTotal: number;
  fuelCost?: number;
  fuelLitres?: number;
  earnings: number;
  date: Date;
  createdAt: Date;
}

const RideSchema: Schema = new Schema({
  platform: { type: String, required: true, enum: ['Uber', '99'] },
  rides: { type: Number, required: true },
  kmStart: { type: Number, required: true },
  kmEnd: { type: Number, required: true },
  kmTotal: { type: Number, required: true },
  fuelCost: { type: Number, default: 0 },
  fuelLitres: { type: Number, default: 0 },
  earnings: { type: Number, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);

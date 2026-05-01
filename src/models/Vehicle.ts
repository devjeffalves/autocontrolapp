import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Omit<Document, 'model'> {
  model: string;
  plate: string;
  fuelType: string;
  currentKm: number;
  avgConsumption: number;
  lastUpdated: Date;
}

const VehicleSchema: Schema = new Schema({
  model: { type: String, required: true },
  plate: { type: String, required: true },
  fuelType: { type: String, required: true },
  currentKm: { type: Number, required: true },
  avgConsumption: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

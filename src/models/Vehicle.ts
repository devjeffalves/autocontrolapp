import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder {
  _id?: string;
  title: string;
  dueInfo: string;
  status: 'ok' | 'urgent';
}

export interface IOilCheck {
  _id?: string;
  date: Date;
  km: number;
  imageUrl?: string;
}

export interface IVehicle extends Omit<Document, 'model'> {
  model: string;
  plate: string;
  fuelType: string;
  currentKm: number;
  avgConsumption: number;
  lastUpdated: Date;
  reminders: IReminder[];
  oilChecks: IOilCheck[];
}

const VehicleSchema: Schema = new Schema({
  model: { type: String, required: true },
  plate: { type: String, required: true },
  fuelType: { type: String, required: true },
  currentKm: { type: Number, required: true },
  avgConsumption: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
  reminders: [{
    title: { type: String, required: true },
    dueInfo: { type: String, required: true },
    status: { type: String, enum: ['ok', 'urgent'], default: 'ok' }
  }],
  oilChecks: [{
    date: { type: Date, default: Date.now },
    km: { type: Number },
    imageUrl: { type: String }
  }]
});

export default mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

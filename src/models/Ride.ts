import mongoose, { Schema, Document } from 'mongoose';

export interface IFueling {
  cost: number;
  litres: number;
  date: Date;
  km?: number;
}

export interface IRide extends Document {
  platform: 'Aplicativos' | 'Passeio';
  rides: number;
  kmStart: number;
  kmEnd?: number;
  kmTotal?: number;
  fuelings: IFueling[];
  earnings: number;
  status: 'open' | 'closed';
  date: Date;
  createdAt: Date;
}

const RideSchema: Schema = new Schema({
  platform: { type: String, required: true, enum: ['Aplicativos', 'Passeio'], default: 'Aplicativos' },
  rides: { type: Number, default: 0 },
  kmStart: { type: Number, required: true },
  kmEnd: { type: Number },
  kmTotal: { type: Number },
  fuelings: [{
    cost: { type: Number, required: true },
    litres: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    km: { type: Number }
  }],
  earnings: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  date: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);

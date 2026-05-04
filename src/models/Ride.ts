import mongoose, { Schema, Document } from 'mongoose';

export interface IFueling {
  cost: number;
  litres: number;
  date: Date;
}

export interface IRide extends Document {
  platform: 'Uber' | '99' | 'Both' | 'Passeio';
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
  platform: { type: String, required: true, enum: ['Uber', '99', 'Both', 'Passeio'], default: 'Uber' },
  rides: { type: Number, default: 0 },
  kmStart: { type: Number, required: true },
  kmEnd: { type: Number },
  kmTotal: { type: Number },
  fuelings: [{
    cost: { type: Number, required: true },
    litres: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
  earnings: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  date: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);

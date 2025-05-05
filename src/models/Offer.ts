import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer {
  candidate: Types.ObjectId | { name: string; email: string };
  position: string;
  salary: number;
  validUntil?: Date;
  recruiterEmail: string;
  date: Date;
}

export interface IOfferDocument extends IOffer, Document {}

const OfferSchema = new Schema<IOfferDocument>({
  candidate:     { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
  position:      { type: String,               required: true },
  salary:        { type: Number,               required: true },
  validUntil:    { type: Date },
  recruiterEmail:{ type: String,               required: true },
  date:          { type: Date, default: Date.now },
});

export default model<IOfferDocument>('Offer', OfferSchema);
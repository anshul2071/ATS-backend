import { Schema, model, Document, Types } from 'mongoose'

export interface IOfferDocument extends Document {
  candidate:    Types.ObjectId
  template:     Types.ObjectId
  placeholders: Record<string, any>
  date:         Date
}

const offerSchema = new Schema<IOfferDocument>(
  {
    candidate:    { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    template:     { type: Schema.Types.ObjectId, ref: 'OfferTemplate', required: true },
    placeholders: { type: Schema.Types.Mixed, default: {} },
    date:         { type: Date, default: () => new Date() },
  }
)

export default model<IOfferDocument>('Offer', offerSchema)

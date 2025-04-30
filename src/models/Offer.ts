import mongoose, { Schema, Document } from 'mongoose'

export interface IOffer extends Document {
  candidate: mongoose.Types.ObjectId
  template: string
  sentTo: string
  date: Date
}

const OfferSchema = new Schema<IOffer>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    template:  { type: String, required: true },
    sentTo:    { type: String, required: true },
    date:      { type: Date, default: () => new Date() }
  },
  { timestamps: true }
)

export default mongoose.model<IOffer>('Offer', OfferSchema)

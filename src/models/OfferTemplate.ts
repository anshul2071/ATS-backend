import { Schema, model, Document } from 'mongoose'

export interface IOfferTemplate extends Document {
  name: string
  subject: string
  body: string    // e.g. "Hello {{name}}, your salary is {{salary}}..."
  createdAt: Date
  updatedAt: Date
}

const offerTemplateSchema = new Schema<IOfferTemplate>(
  {
    name:    { type: String, required: true },
    subject: { type: String, required: true },
    body:    { type: String, required: true },
  },
  { timestamps: true }
)

export default model<IOfferTemplate>('OfferTemplate', offerTemplateSchema)

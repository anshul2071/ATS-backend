import { Schema, model, Document } from 'mongoose'

export interface ICandidate extends Document {
  name: string
  email: string
  phone?: string
  references?: string
  technology: string
  level: string
  salaryExpectation?: number
  experience?: number
  status: string
  createdAt: Date
  updatedAt: Date
}

const candidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    references: { type: String },
    technology: { type: String, required: true },
    level: { type: String, required: true },
    salaryExpectation: { type: Number },
    experience: { type: Number },
    status: {
      type: String,
      enum: [
        'Shortlisted',
        'First Interview',
        'Second Interview',
        'Hired',
        'Rejected',
        'Blacklisted'
      ],
      default: 'Shortlisted'
    }
  },
  { timestamps: true }
)

export default model<ICandidate>('Candidate', candidateSchema)

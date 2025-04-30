import { Schema, model, Document, Types } from 'mongoose'

export interface IAssessment extends Document {
  candidate: Types.ObjectId
  title: string
  fileUrl: string
  remarks?: string
  score?: number
  date: Date
}

const assessmentSchema = new Schema<IAssessment>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    remarks: { type: String },
    score: { type: Number },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

export default model<IAssessment>('Assessment', assessmentSchema)

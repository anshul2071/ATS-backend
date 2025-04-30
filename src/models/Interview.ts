// src/models/Interview.ts
import { Schema, model, Document, Types } from 'mongoose'

export interface IInterview extends Document {
  candidate:   Types.ObjectId
  round:       string
  interviewer: string
  date:        Date
  createdAt:   Date
  updatedAt:   Date
}

const interviewSchema = new Schema<IInterview>(
  {
    candidate:   { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    round:       { type: String, required: true },
    interviewer: { type: String, required: true },
    date:        { type: Date,   required: true },
  },
  { timestamps: true }
)

export default model<IInterview>('Interview', interviewSchema)

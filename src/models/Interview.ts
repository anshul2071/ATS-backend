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
 export const PIPELINE_STAGES = [
  'HR Screening',
  'Technical Interview',
  'Managerial Interview',

 ]

export interface IInterview extends Document {
  candidate:   Types.ObjectId
  pipelineStage: typeof PIPELINE_STAGES[number]
  interviewer: string
  date:        Date
  createdAt:   Date
  updatedAt:   Date
}


const interviewSchema = new Schema <IInterview>({
  candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
  pipelineStage: { type: String, enum: PIPELINE_STAGES, required: true },
  interviewer: { type: String, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
})


export default model<IInterview>('Interview', interviewSchema)

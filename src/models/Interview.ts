// src/models/Interview.ts
import { Schema, model, Document, Types } from 'mongoose'
import { INTERVIEW_STAGES, InterviewStage } from '../constants/pipelineStages'

export interface IInterview {
  candidate: Types.ObjectId | { name: string; email: string }
  pipelineStage: InterviewStage
  interviewerEmail: string
  date: Date
  meetLink: string
}

export interface IInterviewDocument extends IInterview, Document {}

const InterviewSchema = new Schema<IInterviewDocument>({
  candidate: {
    type: Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  pipelineStage: {
    type: String,
    enum: INTERVIEW_STAGES,
    required: true,
  },
  interviewerEmail: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  meetLink: {
    type: String,
    required: true,
  },
})

export default model<IInterviewDocument>('Interview', InterviewSchema)

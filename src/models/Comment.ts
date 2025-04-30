import { Schema, model, Document, Types } from 'mongoose'

export interface IComment extends Document {
  candidate: Types.ObjectId
  user: string
  content: string
  datetime: Date
}

const commentSchema = new Schema<IComment>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    user: { type: String, required: true },
    content: { type: String, required: true },
    datetime: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

export default model<IComment>('Comment', commentSchema)

import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessment extends Document {
  candidate: mongoose.Types.ObjectId;
  title: string;
  fileUrl: string;
  remarks?: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    remarks: { type: String },
    score: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAssessment>('Assessment', AssessmentSchema);

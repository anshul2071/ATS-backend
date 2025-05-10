import mongoose, { Document, Schema } from 'mongoose';

export type TemplateType = 'offer' | 'rejection';

export interface ILetter extends Document {
  candidate: mongoose.Types.ObjectId;
  templateType: TemplateType;
  position: string;
  technology: string;
  startingDate: Date;
  salary: number;
  probationDate: Date;
  acceptanceDeadline: Date;
  sentTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const LetterSchema = new Schema<ILetter>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    templateType: { type: String, enum: ['offer', 'rejection'], required: true },
    position: { type: String, required: true },
    technology: { type: String, required: true },
    startingDate: { type: Date, required: true },
    salary: { type: Number, required: true },
    probationDate: { type: Date, required: true },
    acceptanceDeadline: { type: Date, required: true },
    sentTo: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILetter>('Letter', LetterSchema);

// src/models/Letter.ts

import mongoose, { Document, Schema } from 'mongoose';

export type TemplateType = 'offer' | 'rejection';

export interface ILetter extends Document {
  candidate: mongoose.Types.ObjectId;
  templateType: TemplateType;
  position?: string;
  technology?: string;
  startingDate?: Date;
  salary?: number;
  probationDate?: Date;
  acceptanceDeadline?: Date;
  sentTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const LetterSchema = new Schema<ILetter>(
  {
    candidate: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    templateType: {
      type: String,
      enum: ['offer', 'rejection'],
      required: true,
    },
    position: {
      type: String,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    technology: {
      type: String,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    startingDate: {
      type: Date,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    salary: {
      type: Number,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    probationDate: {
      type: Date,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    acceptanceDeadline: {
      type: Date,
      required: function (this: ILetter) {
        return this.templateType === 'offer';
      },
    },
    sentTo: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILetter>('Letter', LetterSchema);

// src/models/Candidate.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface ICandidateDocument extends Document {
  name:               string;
  email:              string;
  phone?:             string;
  references?:        string;
  technology:         string;
  level:              string;
  cvUrl?:             string;
  salaryExpectation?: number;
  experience?:        number;
  status:             'Shortlisted'
                     | 'HR Screening'
                     | 'Technical Interview'
                     | 'Managerial Interview'
                     | 'Hired'
                     | 'Rejected'
                     | 'Blacklisted';
  letters:            Types.ObjectId[];
  assessments:        Types.ObjectId[];
  createdAt:          Date;
  updatedAt:          Date;
}

const candidateSchema = new Schema<ICandidateDocument>(
  {
    name:              { type: String, required: true },
    email:             { type: String, required: true, unique: true },
    phone:             { type: String },
    references:        { type: String },
    technology:        { type: String, required: true },
    level:             { type: String, required: true },
    salaryExpectation: { type: Number },
    cvUrl:             { type: String },
    experience:        { type: Number },
    status: {
      type: String,
      enum: [
        'Shortlisted',
        'HR Screening',
        'Technical Interview',
        'Managerial Interview',
        'Hired',
        'Rejected',
        'Blacklisted',
      ],
      default: 'Shortlisted',
    },
    letters: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Letter' }],
      default: [],            // ← ensure it's always an array
    },
    assessments: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Assessment' }],
      default: [],            // ← same here
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default model<ICandidateDocument>('Candidate', candidateSchema);

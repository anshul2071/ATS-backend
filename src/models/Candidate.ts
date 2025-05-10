// src/models/Candidate.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICandidateDocument extends Document {
  name:               string;
  email:              string;
  phone?:             string;
  references?:        string;
  technology:         string;
  level:              string;
  salaryExpectation?: number;
  experience?:        number;
  status:             'Shortlisted'
                     | 'First Interview'
                     | 'Second Interview'
                     | 'Hired'
                     | 'Rejected'
                     | 'Blacklisted';
  // **New fields** for relational data:
  letters:            Types.ObjectId[];      
  assessments:        Types.ObjectId[];      

  createdAt:          Date;
  updatedAt:          Date;
}

const candidateSchema = new Schema<ICandidateDocument>(
  {
    name:             { type: String, required: true },
    email:            { type: String, required: true, unique: true },
    phone:            { type: String },
    references:       { type: String },
    technology:       { type: String, required: true },
    level:            { type: String, required: true },
    salaryExpectation:{ type: Number },
    experience:       { type: Number },
    status: {
      type: String,
      enum: [
        'Shortlisted',
        'First Interview',
        'Second Interview',
        'Hired',
        'Rejected',
        'Blacklisted',
      ],
      default: 'Shortlisted',
    },


    letters: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Letter',
      }
    ],
    assessments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
      }
    ],
  },
  {
    timestamps: true,          
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


export default model<ICandidateDocument>('Candidate', candidateSchema);

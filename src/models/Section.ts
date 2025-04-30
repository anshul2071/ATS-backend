import { Schema, model, Document } from 'mongoose'

export interface ISection extends Document {
  sections: string[]
}

const sectionSchema = new Schema<ISection>(
  {
    sections: { type: [String], default: [] }
  },
  { timestamps: true }
)

export default model<ISection>('Section', sectionSchema)

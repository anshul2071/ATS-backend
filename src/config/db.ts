import mongoose from 'mongoose'

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI!
  await mongoose.connect(uri)
  console.log(`✅ Connected to MongoDB`)
}

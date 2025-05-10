import mongoose from 'mongoose';

const mongoURI = process.env.MONGO_URI!;

export const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
     
      tls: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if DB connection fails
  }
};

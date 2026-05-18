import mongoose from "mongoose";

// Central MongoDB connection helper used by server.js before the API starts.
export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();

  // Failing early gives a clear setup error instead of random database failures later.
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  // Mongoose manages the connection pool after this call succeeds.
  await mongoose.connect(mongoUri);
  console.log("DB Connected");
};

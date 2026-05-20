import mongoose from "mongoose";

// MongoDB creates collections lazily. These two are created at startup so
// Compass/Atlas shows the new project collections even before the first record.
const ensureCoreCollections = async () => {
  const collectionNames = ["carts", "refunds"];

  for (const collectionName of collectionNames) {
    const exists = await mongoose.connection.db
      .listCollections({ name: collectionName })
      .hasNext();

    if (!exists) {
      await mongoose.connection.createCollection(collectionName);
    }
  }
};

// Central MongoDB connection helper used by server.js before the API starts.
export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();

  // Failing early gives a clear setup error instead of random database failures later.
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  // Mongoose manages the connection pool after this call succeeds.
  await mongoose.connect(mongoUri);
  await ensureCoreCollections();
  console.log("DB Connected");
};

/**
 * config/db.ts
 * MongoDB connection with retry logic
 */

import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = process.env.NODE_ENV === "production"
    ? (process.env.MONGO_URI_PROD as string)
    : (process.env.MONGO_URI as string);

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  let retries = 5;

  while (retries > 0) {
    try {
      await mongoose.connect(uri, options);
      console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
      mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));

      return;
    } catch (err) {
      retries -= 1;
      console.error(`❌ MongoDB connection failed. Retries left: ${retries}`);
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s before retry
    }
  }
};

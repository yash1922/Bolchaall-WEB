import mongoose from "mongoose";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  connecting = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    })
    .then((m) => {
      console.log(`[db] connected: host=${m.connection.host} db=${m.connection.name}`);
      return m;
    })
    .catch((err) => {
      connecting = null;
      console.error("[db] connection failed:", err.message);
      throw err;
    });

  return connecting;
}

export function disconnectDB(): Promise<void> {
  return mongoose.disconnect();
}

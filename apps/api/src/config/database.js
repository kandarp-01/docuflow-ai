import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/docuflow';

  if (process.env.DISABLE_DB === 'true') {
    console.info('MongoDB connection disabled via DISABLE_DB=true');
    return { connected: false, mode: 'disabled' };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
      maxPoolSize: 10,
      autoIndex: true
    });

    console.info('MongoDB connected');
    return { connected: true, mode: 'live' };
  } catch (error) {
    console.warn('MongoDB unavailable. Continuing in development fallback mode:', error.message);
    return { connected: false, mode: 'fallback', error: error.message };
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;

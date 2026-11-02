import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection options
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Graceful shutdown (long-running server; serverless functions are stopped by the platform)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// One connection per process. On Vercel a warm function instance reuses it across requests,
// and concurrent first requests share the same connection attempt.
let connecting: Promise<unknown> | null = null;

/**
 * Connect to MongoDB (no-op when already connected). Throws on failure instead of exiting the
 * process: the long-running server exits in startServer(); the serverless handler answers 503
 * and the next request tries again.
 */
export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not defined');

  if (!connecting) {
    connecting = mongoose.connect(uri, options)
      .then(() => console.log(`🗄️ Connected to MongoDB: ${mongoose.connection.host}`))
      .finally(() => {
        connecting = null;
      });
  }
  await connecting;
};

// Disconnect from MongoDB
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};

export default mongoose;

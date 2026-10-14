import IORedis from 'ioredis';
import { Queue } from 'bullmq';

let processingQueue = null;
let redisClient = null;

export async function connectQueue() {
  const connectionString = process.env.REDIS_URL ?? 'redis://localhost:6379';

  try {
    redisClient = new IORedis(connectionString, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 1000,
      retryStrategy(times) {
        return times > 1 ? null : 100;
      }
    });

    redisClient.on('error', () => {
      // Ignore connection noise while Redis is not yet running in local dev.
    });

    await redisClient.connect();
    processingQueue = new Queue('docuflow-processing', { connection: redisClient });
    console.info('Redis queue connected');
    return { connected: true, mode: 'live' };
  } catch (error) {
    console.warn('Redis unavailable. Continuing in fallback mode:', error.message);
    if (redisClient) {
      redisClient.disconnect();
    }
    redisClient = null;
    processingQueue = null;
    return { connected: false, mode: 'fallback', error: error.message };
  }
}

export function getQueue() {
  return processingQueue;
}

export function isQueueConnected() {
  return Boolean(processingQueue);
}

export async function enqueueDocumentJob(payload) {
  if (!processingQueue) {
    return null;
  }

  return processingQueue.add('process-document', payload, {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 20 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
}

import { createClient } from 'redis';

// Redis Client singleton
const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient> | undefined;
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis =
  globalForRedis.redis ??
  createClient({
    url: redisUrl,
  });

let isRedisAvailable = false;

redis.on('error', (err) => {
  console.warn('⚠️  Redis Client Error (continuing without cache):', err.message);
  isRedisAvailable = false;
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
  isRedisAvailable = true;
});

// Helper function to safely use Redis
export async function safeRedisGet(key: string): Promise<string | null> {
  if (!isRedisAvailable || !redis.isOpen) {
    return null;
  }
  try {
    return await redis.get(key);
  } catch (error) {
    console.warn(`Redis get error for key ${key}:`, error);
    return null;
  }
}

export async function safeRedisSetEx(key: string, seconds: number, value: string): Promise<void> {
  if (!isRedisAvailable || !redis.isOpen) {
    return;
  }
  try {
    await redis.setEx(key, seconds, value);
  } catch (error) {
    console.warn(`Redis setEx error for key ${key}:`, error);
  }
}

export async function safeRedisDel(keys: string[]): Promise<void> {
  if (!isRedisAvailable || !redis.isOpen || keys.length === 0) {
    return;
  }
  try {
    await redis.del(keys);
  } catch (error) {
    console.warn(`Redis del error:`, error);
  }
}

export async function safeRedisKeys(pattern: string): Promise<string[]> {
  if (!isRedisAvailable || !redis.isOpen) {
    return [];
  }
  try {
    return await redis.keys(pattern);
  } catch (error) {
    console.warn(`Redis keys error for pattern ${pattern}:`, error);
    return [];
  }
}

// Note: Redis connection will be established on first use or explicitly in app startup
// Don't connect here to avoid blocking module load

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;


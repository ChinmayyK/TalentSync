import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('CacheUtil');
// Parse Redis URL or use host/port
const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

export const cache = new Redis(redisUrl);

cache.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

export async function getCached<T>(key: string): Promise<T | null> {
  const data = await cache.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCached(
  key: string,
  value: any,
  ttlSec: number = 3600,
): Promise<void> {
  await cache.set(key, JSON.stringify(value), 'EX', ttlSec);
}

export async function invalidateCache(pattern: string): Promise<void> {
  const stream = cache.scanStream({ match: pattern });
  stream.on('data', async (keys) => {
    if (keys.length) {
      await cache.unlink(keys);
    }
  });
}

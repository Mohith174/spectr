import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (err) {
    console.warn("[redis] get failed, treating as cache miss:", key, err);
  }

  const result = await fn();

  if (result != null) {
    try {
      await redis.setex(key, ttlSeconds, result);
    } catch (err) {
      console.warn("[redis] setex failed (non-fatal):", key, err);
    }
  }

  return result;
}

import { Redis } from "@upstash/redis";
import { getConfig, hasRedis } from "@/lib/config";

let redis: Redis | null = null;

export function getRedisClient() {
  if (!hasRedis()) return null;
  if (redis) return redis;
  const config = getConfig();
  redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken
  });
  return redis;
}

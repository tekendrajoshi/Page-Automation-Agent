import IORedis from "ioredis";
import { env } from "@/lib/config";

export function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
}

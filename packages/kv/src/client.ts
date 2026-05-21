import { REDIS_URL } from "@carbon/env";
import Redis from "ioredis";

declare global {
  var __redis: Redis | undefined;
}

if (REDIS_URL) {
  if (!global.__redis) {
    global.__redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: true,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      }
    });
  }
}

const redis = global.__redis;

export default redis;

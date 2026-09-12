import { Queue } from "bullmq";
import { createRedisConnection } from "@/lib/redis";

export const automationQueue = new Queue("automation", {
  connection: createRedisConnection()
});

export async function enqueueFullRun() {
  return automationQueue.add(
    "full-run",
    {},
    {
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );
}

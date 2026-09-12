import { Queue } from "bullmq";
import { env } from "@/lib/config";

export const automationQueue = new Queue("automation", {
  connection: { url: env.REDIS_URL }
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

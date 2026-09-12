import cron from "node-cron";
import { Worker } from "bullmq";
import { env } from "@/lib/config";
import { runFullAutomation, runGmailAutomation, runSourceAutomation } from "@/lib/workflows/pipeline";

const worker = new Worker(
  "automation",
  async (job) => {
    if (job.name === "gmail-run") return runGmailAutomation();
    if (job.name === "source-run") return runSourceAutomation();
    return runFullAutomation();
  },
  { connection: { url: env.REDIS_URL } }
);

worker.on("completed", (job) => {
  console.log(`[worker] ${job.name} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] ${job?.name ?? "job"} failed`, error);
});

cron.schedule("*/30 * * * *", () => runGmailAutomation().catch(console.error), {
  timezone: env.APP_TIMEZONE
});

cron.schedule("0 7,12,18 * * *", () => runSourceAutomation().catch(console.error), {
  timezone: env.APP_TIMEZONE
});

console.log(`[worker] Automation worker started in ${env.APP_TIMEZONE}`);

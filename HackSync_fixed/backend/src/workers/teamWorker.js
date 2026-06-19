import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
});

connection.on("error", (e) => console.warn("[TeamWorker] Redis error:", e.message));

const worker = new Worker(
  "teamQueue",
  async (job) => {
    console.log("Processing Job:", job.data);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Job Completed");
  },
  { connection }
);

worker.on("completed", (job) => console.log(`Completed job ${job.id}`));
worker.on("failed", (job, err) => console.log(`Failed job ${job.id}`, err));
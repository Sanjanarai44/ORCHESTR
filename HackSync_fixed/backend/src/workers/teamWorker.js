import { Worker } from "bullmq";
import sharedRedis from "../config/sharedRedis.js";

const worker = new Worker(
  "teamQueue",
  async (job) => {
    console.log("Processing Job:", job.data);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Job Completed");
  },
  { connection: sharedRedis }
);

worker.on("completed", (job) => console.log(`Completed job ${job.id}`));
worker.on("failed", (job, err) => console.log(`Failed job ${job.id}`, err));
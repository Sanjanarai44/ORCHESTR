import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "teamQueue",
  async (job) => {
    console.log("Processing Job:");

    console.log(job.data);

    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );

    console.log("Job Completed");
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.log(`Failed job ${job.id}`);

  console.log(err);
});
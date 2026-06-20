import { Queue } from "bullmq";
import sharedRedis from "../config/sharedRedis.js";

export const teamQueue = new Queue("teamQueue", {
  connection: sharedRedis,
});
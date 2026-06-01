import 'dotenv/config';
import { emailQueue } from '../queues/emailQueue.js';

async function main() {
  try {
    const rawData = process.argv[2];
    if (!rawData) {
      console.error("No JSON payload provided");
      process.exit(1);
    }

    const payload = JSON.parse(rawData);
    
    // Add job to BullMQ
    // emailQueue.add(name, data, options)
    const jobId = payload.jobId || `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    await emailQueue.add('send_email', payload, { jobId });
    
    console.log(`[Bridge] Successfully queued ${payload.emailType} for ${payload.recipientEmail} (Job ID: ${jobId})`);
    
    // Must gracefully close Redis connections so process can exit
    await emailQueue.close();
    process.exit(0);
  } catch (error) {
    console.error("[Bridge] Failed to queue job:", error);
    process.exit(1);
  }
}

main();

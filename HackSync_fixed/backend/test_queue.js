import 'dotenv/config';
import { emailQueue } from './src/queues/emailQueue.js';

async function testQueue() {
  console.log("Adding test job to Upstash Redis...");
  await emailQueue.add('send_email', {
    recipientId: 'test_123',
    recipientEmail: process.env.COMMITTEE_EMAIL || 'shraddhasharmastp1@gmail.com', // Sends to their email
    recipientName: 'Test Judge',
    emailType: 'magic_link',
    templateData: {
      judgeName: 'Test Judge',
      magicLink: 'http://localhost:5173/?token=test_token',
      expiryHours: 48
    }
  }, { jobId: `test_${Date.now()}` });
  
  console.log("Job successfully added to Upstash Redis queue!");
  process.exit(0);
}

testQueue().catch(console.error);

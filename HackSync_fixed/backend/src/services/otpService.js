import prisma from "../config/prisma.js";
import { emailQueue } from "../queues/emailQueue.js";

// Generates a 6-digit numeric OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates and queues an OTP via Email using BullMQ
 * @param {string} email - The recipient's email address
 * @param {string} name - The recipient's name (optional)
 * @param {string} userId - The recipient's user ID (optional)
 */
export async function sendEmailOTP(email, name = "", userId = "") {
  if (!email) {
    throw new Error("Email is required");
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

  // Store in DB
  await prisma.otpCode.create({
    data: {
      email,
      code,
      expiresAt,
    },
  });

  // Create EmailLog
  const emailLog = await prisma.emailLog.create({
    data: {
      recipientId: userId || "unknown",
      recipientEmail: email,
      recipientName: name,
      emailType: 'otp',
      status: 'PENDING'
    }
  });

  // Queue for SendGrid via BullMQ
  await emailQueue.add('send_email', {
    emailType: 'otp',
    recipientId: userId,
    recipientEmail: email,
    templateData: {
      name: name,
      code: code
    },
    logId: emailLog.id
  }, { jobId: `otp_${email}_${Date.now()}` });

  return { success: true };
}

/**
 * Verifies an OTP for a given email address.
 * @param {string} email 
 * @param {string} code 
 * @returns {boolean} True if valid, False if invalid or expired.
 */
export async function verifyOTP(email, code) {
  if (!email || !code) return false;

  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      email,
      code,
      expiresAt: {
        gt: new Date(), // Must not be expired
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (otpRecord) {
    // Optionally delete it so it can't be reused
    await prisma.otpCode.delete({ where: { id: otpRecord.id } });
    return true;
  }

  return false;
}

/**
 * System 4: BullMQ Email Worker
 * Consumes jobs from the email_queue and sends emails via SendGrid.
 *
 * 5 email types handled:
 *   magic_link      — Judge magic link (JWT auth)
 *   welcome         — Participant welcome after team approval
 *   reminder        — Evaluation reminder to judges
 *   results         — Final results notification to participants
 *   anomaly_alert   — Alert to committee when anomaly is detected
 *   otp             — Two-step verification code
 *
 * Run with: node src/workers/emailWorker.js  OR  npm run worker
 */
import 'dotenv/config';
import { Worker } from 'bullmq';
import sgMail from '@sendgrid/mail';
import IORedis from 'ioredis';
import prisma from '../config/prisma.js';

// ── SendGrid setup ────────────────────────────────────────────────────────────
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@algorythm.com';
// ── Redis connection ──────────────────────────────────────────────────────────
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
});

connection.on("error", (e) => console.warn("[EmailWorker] Redis error:", e.message));
// ── Email template builders ───────────────────────────────────────────────────
function buildMagicLinkEmail(data) {
  const { judgeName, magicLink, expiryHours = 48, eventName = 'AlgoRythm EventFlow' } = data;
  return {
    subject: `Your evaluation link — ${eventName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0c0c0c; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">AlgoRythm EventFlow</h1>
          <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">Judge Portal Access</p>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hello, <strong>${judgeName}</strong></p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 32px;">
            You've been invited to evaluate teams for <strong>${eventName}</strong>. Click the button below to access your judge portal and begin scoring.
          </p>
          <a href="${magicLink}" style="display: inline-block; background: #0c0c0c; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
            Access Judge Portal →
          </a>
          <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            ⚠️ This link expires in <strong>${expiryHours} hours</strong> and can only be used once. If you've already used it or need a new link, contact the event organizer.
          </p>
        </div>
      </div>`,
  };
}

function buildWelcomeEmail(data) {
  const { participantName, teamName, teammates = [], eventSchedule = '', portalLink = '' } = data;
  const teammateList = teammates
    .map((t) => `<li style="margin-bottom:4px;">${t.name} (${t.email}) — <em>${t.skill}</em></li>`)
    .join('');
  return {
    subject: `Welcome to ${teamName} — AlgoRythm EventFlow`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0c0c0c; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 700;">AlgoRythm EventFlow</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-size: 20px; color: #111827; margin: 0 0 8px;">You're in — Team <span style="color: #2563eb;">${teamName}</span> 🎉</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hi ${participantName}, your team has been confirmed. Here are your teammates:</p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px;">${teammateList}</ul>
          ${eventSchedule ? `<p style="color: #374151; font-size: 14px;"><strong>Schedule:</strong> ${eventSchedule}</p>` : ''}
          ${portalLink ? `<p><a href="${portalLink}" style="color: #2563eb; font-weight: 600;">View your participant portal →</a></p>` : ''}
        </div>
      </div>`,
  };
}

function buildReminderEmail(data) {
  const { judgeName, teamsRemaining = [], deadline = '', portalLink = '' } = data;
  const teamsList = teamsRemaining
    .map((t) => `<li style="margin-bottom: 4px;">${t}</li>`)
    .join('');
  return {
    subject: 'Evaluation reminder — AlgoRythm EventFlow',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #dc2626; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">⏰ Evaluation Reminder</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #111827;">Hi <strong>${judgeName}</strong>,</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">You have <strong>${teamsRemaining.length}</strong> team(s) remaining to evaluate. The deadline is <strong>${deadline}</strong>.</p>
          <p style="font-size: 14px; color: #374151;">Remaining teams:</p>
          <ul style="color: #374151; font-size: 14px;">${teamsList}</ul>
          ${portalLink ? `<a href="${portalLink}" style="display: inline-block; background: #0c0c0c; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 16px;">Continue Evaluating →</a>` : ''}
        </div>
      </div>`,
  };
}

function buildResultsEmail(data) {
  const { participantName, teamName, rank, score, message = '' } = data;
  const isWinner = rank <= 3;
  return {
    subject: `Results are in — AlgoRythm EventFlow`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: ${isWinner ? '#16a34a' : '#0c0c0c'}; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 700;">${isWinner ? '🏆 Congratulations!' : '📊 Results Published'}</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #111827;">Hi <strong>${participantName}</strong>,</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">
            The final results for <strong>${teamName}</strong> are in. Your team ranked <strong>#${rank}</strong> with an average score of <strong>${score}/10</strong>.
          </p>
          ${message ? `<p style="font-size: 14px; color: #374151; font-style: italic;">${message}</p>` : ''}
        </div>
      </div>`,
  };
}

function buildAnomalyAlertEmail(data) {
  const { teamName, judgeName, deviation, dashboardLink = '' } = data;
  return {
    subject: `⚠️ Score Anomaly Detected — ${teamName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden;">
        <div style="background: #dc2626; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">⚠️ Score Anomaly Alert</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">
            An anomaly has been detected for <strong>${teamName}</strong>. Judge <strong>${judgeName}</strong> submitted a score deviating <strong>${deviation.toFixed(1)} points</strong> from the panel average.
          </p>
          <p style="font-size: 14px; color: #374151;">Please review this score before publishing results.</p>
          ${dashboardLink ? `<a href="${dashboardLink}" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 16px;">Review in Dashboard →</a>` : ''}
        </div>
      </div>`,
  };
}

function buildOtpEmail(data) {
  const { code, name = 'there' } = data;
  return {
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0c0c0c; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">AlgoRythm EventFlow</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #111827;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">Your 6-digit verification code is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            This code will expire in 5 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>`,
  };
}

// ── Template dispatcher ───────────────────────────────────────────────────────
function buildEmail(emailType, templateData) {
  switch (emailType) {
    case 'magic_link':
      return buildMagicLinkEmail(templateData);
    case 'welcome':
      return buildWelcomeEmail(templateData);
    case 'reminder':
      return buildReminderEmail(templateData);
    case 'results':
      return buildResultsEmail(templateData);
    case 'anomaly_alert':
      return buildAnomalyAlertEmail(templateData);
    case 'otp':
      return buildOtpEmail(templateData);
    default:
      return {
        subject: 'AlgoRythm EventFlow Notification',
        html: `<p>${JSON.stringify(templateData)}</p>`,
      };
  }
}

// ── BullMQ Worker ─────────────────────────────────────────────────────────────
const emailWorker = new Worker(
  'email_queue',
  async (job) => {
    const { recipientId, recipientEmail, emailType, templateData } = job.data;

    console.log(`[EmailWorker] Processing job ${job.id}: ${emailType} → ${recipientEmail}`);

    // Fetch AI-generated content from DB if available (written by Sanjana's module)
    let aiContent = null;
    try {
      aiContent = await prisma.aiEmailContent.findFirst({
        where: { recipientId, emailType },
      });
    } catch {
      // Table may not exist yet — fall through to template builder
    }

    // Use AI content if available, else build from template
    let subject, html;
    if (aiContent?.subject && aiContent?.htmlBody) {
      subject = aiContent.subject;
      html = aiContent.htmlBody;
    } else {
      const built = buildEmail(emailType, templateData || {});
      subject = built.subject;
      html = built.html;
    }

    // Send via SendGrid or mock if no key
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to: recipientEmail,
        from: FROM_EMAIL,
        subject: subject,
        html: html,
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false,
          },
        },
      });
    } else {
      console.log(`[EmailWorker] ⚠️ MOCK MODE: SendGrid API Key missing. Simulating successful send.`);
      if (emailType === 'magic_link') {
        console.log(`[EmailWorker] Magic Link: ${templateData?.magicLink}`);
      } else if (emailType === 'otp') {
        console.log(`[EmailWorker] OTP Code: ${templateData?.code}`);
      } else if (emailType === 'welcome') {
        console.log(`[EmailWorker] Portal Link: ${templateData?.portalLink}`);
      }
    }

    // Update log to SENT
    try {
      await prisma.emailLog.updateMany({
        where: { jobId: job.id, status: 'PENDING' },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: job.attemptsMade + 1,
        },
      });
    } catch (logErr) {
      console.warn(`[EmailWorker] Could not update log for job ${job.id}:`, logErr.message);
    }

    console.log(`[EmailWorker] ✓ Sent ${emailType} to ${recipientEmail}`);
    return { sent: true };
  },
  {
    connection,
    concurrency: 5,
  }
);

// ── On job failure (all retries exhausted) ────────────────────────────────────
emailWorker.on('failed', async (job, err) => {
  console.error(`[EmailWorker] ✗ Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);

  try {
    await prisma.emailLog.updateMany({
      where: { jobId: job?.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        attempts: job?.attemptsMade || 0,
      },
    });
  } catch (logErr) {
    console.warn(`[EmailWorker] Could not update failure log:`, logErr.message);
  }
});

// ── Event logging ─────────────────────────────────────────────────────────────
emailWorker.on('completed', (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully.`);
});

emailWorker.on('error', (err) => {
  console.error('[EmailWorker] Worker error:', err);
});

console.log('[EmailWorker] Started — listening on email_queue');

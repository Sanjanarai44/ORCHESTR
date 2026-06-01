import 'dotenv/config';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@algorythm.com';

async function testEmail() {
  const testRecipient = "YOUR_EMAIL_HERE@example.com"; // Change this to your real email!
  
  const htmlTemplate = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0c0c0c; padding: 32px 40px;">
          <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">AlgoRythm EventFlow</h1>
          <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">System Diagnostics</p>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hello, <strong>System Admin</strong></p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 32px;">
            This is a test email sent directly from your <strong>SendGrid API integration</strong>. If you are reading this, your SendGrid keys are configured correctly and the email flow is fully functional!
          </p>
          <a href="http://localhost:5173" style="display: inline-block; background: #0c0c0c; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
            Return to Dashboard →
          </a>
        </div>
      </div>`;

  console.log(`Attempting to send test email via SendGrid to ${testRecipient}...`);

  try {
    await sgMail.send({
      to: testRecipient,
      from: FROM_EMAIL,
      subject: "SendGrid Test — AlgoRythm EventFlow",
      html: htmlTemplate,
    });
    console.log("✓ SUCCESS! The email was sent. Please check your inbox (and spam folder).");
  } catch (error) {
    console.error("✗ FAILED to send email.");
    if (error.response) {
      console.error(error.response.body);
    } else {
      console.error(error.message);
    }
  }
}

testEmail();

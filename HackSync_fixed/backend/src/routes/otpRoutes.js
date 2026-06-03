import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { sendEmailOTP, verifyOTP } from '../services/otpService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/otp/send
router.post('/send', async (req, res) => {
  try {
    const { token, role } = req.body; // role: 'judge' or 'participant'
    
    if (!token || !role) {
      return res.status(400).json({ success: false, detail: 'Token and role are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, detail: 'Invalid or expired magic link' });
    }

    let user;
    if (role === 'judge') {
      user = await prisma.judge.findUnique({ where: { id: decoded.judgeId } });
    } else if (role === 'participant') {
      user = await prisma.participant.findUnique({ where: { id: decoded.participantId } });
    }

    if (!user) {
      return res.status(404).json({ success: false, detail: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, detail: 'No email registered for this user. Cannot send OTP.' });
    }

    // Send the OTP via Email
    await sendEmailOTP(user.email, user.name, user.id);

    // Return masked email (e.g., s***@example.com)
    const emailParts = user.email.split('@');
    const maskedEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];

    return res.json({ success: true, detail: 'OTP sent successfully to email', maskedEmail });

  } catch (error) {
    console.error('[OTP Route] Error sending OTP:', error);
    return res.status(500).json({ success: false, detail: 'Internal server error' });
  }
});

// POST /api/otp/verify
router.post('/verify', async (req, res) => {
  try {
    const { token, role, code } = req.body;
    
    if (!token || !role || !code) {
      return res.status(400).json({ success: false, detail: 'Token, role, and code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, detail: 'Invalid or expired magic link' });
    }

    let user;
    if (role === 'judge') {
      user = await prisma.judge.findUnique({ where: { id: decoded.judgeId } });
    } else if (role === 'participant') {
      user = await prisma.participant.findUnique({ where: { id: decoded.participantId } });
    }

    if (!user || !user.email) {
      return res.status(404).json({ success: false, detail: 'User not found or no email' });
    }

    const isValid = await verifyOTP(user.email, code);
    
    if (!isValid) {
      return res.status(401).json({ success: false, detail: 'Invalid or expired OTP code' });
    }

    // If valid, return success and the final session info
    return res.json({
      success: true,
      sessionToken: token, // Re-using the magic link token as session token
      userId: user.id,
      userName: user.name,
      role
    });

  } catch (error) {
    console.error('[OTP Route] Error verifying OTP:', error);
    return res.status(500).json({ success: false, detail: 'Internal server error' });
  }
});

export default router;

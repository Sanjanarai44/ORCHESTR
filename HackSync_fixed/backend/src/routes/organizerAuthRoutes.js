import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

function signToken(org) {
  return jwt.sign({ id: org.id, name: org.name, email: org.email }, JWT_SECRET, { expiresIn: '30d' });
}

function publicOrganizer(org) {
  return {
    id: org.id,
    name: org.name,
    email: org.email,
    authProvider: org.authProvider,
    avatarUrl: org.avatarUrl || null,
  };
}

router.get("/auth/test", (req, res) => {
  res.send("Auth routes working");
});

// ─── Email + password ──────────────────────────────────────────────
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, error: 'Name, email and password are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.organizer.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.json({ success: false, error: 'An account with this email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const organizer = await prisma.organizer.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashed, authProvider: 'email' },
    });
    return res.json({ success: true, organizer: publicOrganizer(organizer), token: signToken(organizer) });
  } catch (e) {
    console.error('Register error:', e);
    return res.json({ success: false, error: 'Could not create account' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, error: 'Email and password are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const organizer = await prisma.organizer.findUnique({ where: { email: normalizedEmail } });
    if (!organizer || !organizer.password) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, organizer.password);
    if (!match) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }
    return res.json({ success: true, organizer: publicOrganizer(organizer), token: signToken(organizer) });
  } catch (e) {
    console.error('Login error:', e);
    return res.json({ success: false, error: 'Could not log in' });
  }
});

// ─── Profile ────────────────────────────────────────────────────────
router.get('/api/admin/profile', async (req, res) => {
  try {
    const { organizerId } = req.query;
    if (!organizerId) return res.status(400).json({ success: false, message: 'organizerId required' });
    const organizer = await prisma.organizer.findUnique({ where: { id: String(organizerId) } });
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });
    return res.json({ success: true, organizer: publicOrganizer(organizer) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/api/admin/profile', async (req, res) => {
  try {
    const { organizerId, name, email, currentPassword, newPassword } = req.body;
    if (!organizerId) return res.status(400).json({ success: false, message: 'organizerId required' });

    const organizer = await prisma.organizer.findUnique({ where: { id: String(organizerId) } });
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

    const data = {};
    if (name && name.trim()) data.name = name.trim();

    if (email && email.trim().toLowerCase() !== organizer.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await prisma.organizer.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== organizer.id) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      data.email = normalizedEmail;
    }

    if (newPassword) {
      if (organizer.password) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, message: 'Current password required to set a new password' });
        }
        const match = await bcrypt.compare(currentPassword, organizer.password);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.organizer.update({ where: { id: organizer.id }, data });
    return res.json({ success: true, organizer: publicOrganizer(updated) });
  } catch (e) {
    console.error('Profile update error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Google OAuth ───────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(new Error('Google account has no email'));
    let organizer = await prisma.organizer.findUnique({ where: { email } });
    if (!organizer) {
      organizer = await prisma.organizer.create({
        data: {
          name: profile.displayName || 'Organizer',
          email,
          authProvider: 'google',
          providerId: profile.id,
          avatarUrl: profile.photos?.[0]?.value || null,
        },
      });
    }
    return done(null, organizer);
  } catch (e) {
    return done(e);
  }
}));
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const org = await prisma.organizer.findUnique({ where: { id } });
    done(null, org);
  } catch (e) {
    done(e, null);
  }
});
// ✅ session: true so Passport can store OAuth state between redirect hops
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?authError=true` }),
  (req, res) => {
    const token = signToken(req.user);
    const payload = encodeURIComponent(JSON.stringify(publicOrganizer(req.user)));
    res.redirect(`${FRONTEND_URL}/?adminToken=${token}&organizer=${payload}`);
  }
);

// ─── GitHub OAuth (optional) ────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${BACKEND_URL}/auth/github/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email =
        profile.emails?.[0]?.value?.toLowerCase() ||
        `${profile.username}@users.noreply.github.com`;
      let organizer = await prisma.organizer.findUnique({ where: { email } });
      if (!organizer) {
        organizer = await prisma.organizer.create({
          data: {
            name: profile.displayName || profile.username || 'Organizer',
            email,
            authProvider: 'github',
            providerId: String(profile.id),
            avatarUrl: profile.photos?.[0]?.value || null,
          },
        });
      }
      return done(null, organizer);
    } catch (e) {
      return done(e);
    }
  }));

  router.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/?authError=true` }),
    (req, res) => {
      const token = signToken(req.user);
      const payload = encodeURIComponent(JSON.stringify(publicOrganizer(req.user)));
      res.redirect(`${FRONTEND_URL}/?adminToken=${token}&organizer=${payload}`);
    }
  );
}

export default router;
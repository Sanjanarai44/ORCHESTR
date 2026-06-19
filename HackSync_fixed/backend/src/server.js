import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config(); // ← MUST be first, before any other imports that read env vars

import session from "express-session";
import passport from "passport";

// Workers — wrap in try/catch so a Redis crash doesn't kill the server
try { await import('./workers/emailWorker.js'); } catch(e) { console.warn('emailWorker failed to load:', e.message); }
try { await import('./workers/teamWorker.js'); } catch(e) { console.warn('teamWorker failed to load:', e.message); }
try { await import('./workers/anomalyWorker.js'); } catch(e) { console.warn('anomalyWorker failed to load:', e.message); }

import uploadRoutes from "./routes/uploadRoutes.js";
import calibrationRoutes from "./routes/calibrationRoutes.js";
import adminTeamRoutes from "./routes/adminTeamRoutes.js";
import adminJudgesRoutes from "./routes/adminJudgesRoutes.js";
import emailLogsRoutes from "./routes/emailLogsRoutes.js";
import judgeAuthRoutes from "./routes/judgeAuthRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import participantRoutes from "./routes/participantRoutes.js";
import organizerAuthRoutes from "./routes/organizerAuthRoutes.js";
import githubRoutes from "./routes/github.routes.js";

const app = express();

const isProd = process.env.NODE_ENV === "production";

// ─── CORS ────────────────────────────────────────────────────────────
// Must explicitly allow the frontend origin + credentials for OAuth cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

// ─── Session (OAuth state only — no persistent login) ────────────────
// In production on Render, frontend and backend are on different subdomains,
// so we need sameSite:'none' + secure:true for the cookie to be sent back
// on the OAuth callback.
app.use(session({
  secret: process.env.SESSION_SECRET || "orchestr-oauth-state-secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProd,           // true in prod (HTTPS only)
    sameSite: isProd ? "none" : "lax",  // 'none' required for cross-origin cookies
    maxAge: 5 * 60 * 1000,   // 5 min — just long enough for the OAuth dance
  },
}));

app.use(passport.initialize());

// ─── Routes ──────────────────────────────────────────────────────────
app.use("/", organizerAuthRoutes);
app.use("/api/admin", uploadRoutes);
app.use("/api/admin", adminTeamRoutes);
app.use("/api/admin", adminJudgesRoutes);
app.use("/api/admin/emails", emailLogsRoutes);
app.use("/api/admin/calibration", calibrationRoutes);
app.use("/api/judge", judgeAuthRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/github", githubRoutes);

app.get("/", (req, res) => res.send("ORCHESTR Node Backend - Port 5000"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
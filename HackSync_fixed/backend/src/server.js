console.log("GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET =", process.env.GOOGLE_CLIENT_SECRET ? "FOUND" : "MISSING");
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import './workers/emailWorker.js';
import './workers/teamWorker.js';
import './workers/anomalyWorker.js';
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
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Short-lived session, only used to hold OAuth handshake state (CSRF protection
// during the Google/GitHub redirect dance). We issue our own JWT afterwards —
// no persistent login session is kept.
app.use(session({
  secret: process.env.SESSION_SECRET || "orchestr-oauth-state-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, sameSite: "lax", maxAge: 5 * 60 * 1000 },
}));
app.use(passport.initialize());

// Organizer auth: register/login + Google/GitHub OAuth + profile
app.use("/", organizerAuthRoutes);

// Data routes - all PostgreSQL via Prisma
app.use("/api/admin", uploadRoutes);      // participants + CSV upload
app.use("/api/admin", adminTeamRoutes);   // teams + generate + approve + stages + activity + scores
app.use("/api/admin", adminJudgesRoutes); // judges CRUD + send links + assign
app.use("/api/admin/emails", emailLogsRoutes);
//app.use("/api/admin/calibration", calibrationRoutes); // Z-score normalisation and anomaly checks
app.use("/api/admin/calibration", calibrationRoutes); // Z-score normalisation and anomaly checks
app.use("/api/judge", judgeAuthRoutes);   // verify + teams + evaluate + progress
app.use("/api/otp", otpRoutes);           // send and verify OTP
app.use("/api/mentor", mentorRoutes);     // mentor data persistence
app.use("/api/participants", participantRoutes);
app.use("/api/github", githubRoutes);

app.get("/", (req, res) => res.send("ORCHESTR Node Backend - Port 5000"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import './workers/emailWorker.js';
import uploadRoutes from "./routes/uploadRoutes.js";
import adminTeamRoutes from "./routes/adminTeamRoutes.js";
import adminJudgesRoutes from "./routes/adminJudgesRoutes.js";
import emailLogsRoutes from "./routes/emailLogsRoutes.js";
import judgeAuthRoutes from "./routes/judgeAuthRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Data routes - all PostgreSQL via Prisma
app.use("/api/admin", uploadRoutes);      // participants + CSV upload
app.use("/api/admin", adminTeamRoutes);   // teams + generate + approve + stages + activity + scores
app.use("/api/admin", adminJudgesRoutes); // judges CRUD + send links + assign
app.use("/api/admin/emails", emailLogsRoutes);
app.use("/api/judge", judgeAuthRoutes);   // verify + teams + evaluate + progress
app.use("/api/otp", otpRoutes);           // send and verify OTP
app.use("/api/mentor", mentorRoutes);     // mentor data persistence

app.get("/", (req, res) => res.send("ORCHESTR Node Backend - Port 5000"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
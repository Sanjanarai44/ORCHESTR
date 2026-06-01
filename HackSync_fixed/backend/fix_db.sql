-- Add missing columns to existing tables safely
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'roster';

ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "problemStatement" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "evaluationGuide" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "resultsHeld" BOOLEAN NOT NULL DEFAULT false;

-- TeamMember table
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_participantId_key" ON "TeamMember"("participantId");
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMember_teamId_fkey') THEN
    ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMember_participantId_fkey') THEN
    ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Judge
CREATE TABLE IF NOT EXISTS "Judge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jwtToken" TEXT,
    "tokenUsed" BOOLEAN NOT NULL DEFAULT false,
    "assignedTeams" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Judge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Judge_email_key" ON "Judge"("email");

-- Evaluation
CREATE TABLE IF NOT EXISTS "Evaluation" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "scoreCode" INTEGER NOT NULL,
    "scoreInnovation" INTEGER NOT NULL,
    "scorePresentaion" INTEGER NOT NULL,
    "starRating" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT NOT NULL,
    "discarded" BOOLEAN NOT NULL DEFAULT false,
    "overrideScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Evaluation_judgeId_teamId_key" ON "Evaluation"("judgeId", "teamId");

-- AnomalyFlag
CREATE TABLE IF NOT EXISTS "AnomalyFlag" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "newScore" DOUBLE PRECISION NOT NULL,
    "panelAvg" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "llmExplanation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnomalyFlag_pkey" PRIMARY KEY ("id")
);

-- EmailLog
CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "emailType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- MentorConversation
CREATE TABLE IF NOT EXISTS "MentorConversation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorConversation_pkey" PRIMARY KEY ("id")
);

-- EventSettings
CREATE TABLE IF NOT EXISTS "EventSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSettings_pkey" PRIMARY KEY ("key")
);

-- AiEmailContent
CREATE TABLE IF NOT EXISTS "AiEmailContent" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiEmailContent_pkey" PRIMARY KEY ("id")
);

SELECT 'fix_db.sql completed successfully' as status;
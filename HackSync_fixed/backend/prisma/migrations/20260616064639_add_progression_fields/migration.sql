-- AlterTable
ALTER TABLE "MentorConversation" ADD COLUMN     "participantId" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "inviteStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "qualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionNotes" TEXT;

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MentorConversation" ADD CONSTRAINT "MentorConversation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

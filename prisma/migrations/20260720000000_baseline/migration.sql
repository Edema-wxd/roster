-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'OTHER');

-- CreateEnum
CREATE TYPE "FlowIntensity" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY');

-- CreateEnum
CREATE TYPE "OvulationTestResult" AS ENUM ('NEGATIVE', 'POSITIVE', 'PEAK');

-- CreateEnum
CREATE TYPE "Symptom" AS ENUM ('CRAMPS', 'HEADACHE', 'MOOD_SWINGS', 'FATIGUE', 'BLOATING', 'BREAST_TENDERNESS', 'ACNE', 'BACK_PAIN', 'NAUSEA', 'FOOD_CRAVINGS', 'INSOMNIA');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('CASUAL', 'FORMAL');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "pinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "notes" TEXT,
    "allergies" TEXT,
    "foodPreferences" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gender" "Gender" NOT NULL DEFAULT 'WOMAN',
    "cycleTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultCycleLength" INTEGER NOT NULL DEFAULT 28,
    "defaultPeriodLength" INTEGER NOT NULL DEFAULT 5,
    "defaultLutealPhaseLength" INTEGER NOT NULL DEFAULT 14,
    "predictedCycleLength" DOUBLE PRECISION,
    "predictedVariabilityDays" DOUBLE PRECISION,
    "predictionLastCalculated" TIMESTAMP(3),
    "userId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "cycleLength" INTEGER,
    "periodLength" INTEGER,
    "birthControlNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleDayLog" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flowIntensity" "FlowIntensity",
    "symptoms" "Symptom"[],
    "basalBodyTemp" DOUBLE PRECISION,
    "ovulationTestResult" "OvulationTestResult",
    "notes" TEXT,

    CONSTRAINT "CycleDayLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntimacyEntry" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "protected" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntimacyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" "VisitType" NOT NULL DEFAULT 'CASUAL',
    "status" "VisitStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitPerson" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "VisitPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackComment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_identifier_key" ON "User"("identifier");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "Person_ownerId_idx" ON "Person"("ownerId");

-- CreateIndex
CREATE INDEX "Cycle_personId_startDate_idx" ON "Cycle"("personId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "CycleDayLog_cycleId_date_key" ON "CycleDayLog"("cycleId", "date");

-- CreateIndex
CREATE INDEX "IntimacyEntry_personId_date_idx" ON "IntimacyEntry"("personId", "date");

-- CreateIndex
CREATE INDEX "Visit_scheduledAt_idx" ON "Visit"("scheduledAt");

-- CreateIndex
CREATE INDEX "Visit_ownerId_idx" ON "Visit"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitPerson_visitId_personId_key" ON "VisitPerson"("visitId", "personId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "FeedbackComment_feedbackId_idx" ON "FeedbackComment"("feedbackId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleDayLog" ADD CONSTRAINT "CycleDayLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntimacyEntry" ADD CONSTRAINT "IntimacyEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPerson" ADD CONSTRAINT "VisitPerson_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPerson" ADD CONSTRAINT "VisitPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Migration: área de administração (suspensão de contas e registro de ações).
-- Pode rodar mais de uma vez sem quebrar (IF NOT EXISTS).

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" TEXT;

CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "reason" TEXT,
    "teamId" TEXT,
    "adminName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_logs_createdAt_idx" ON "admin_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "admin_logs_teamId_idx" ON "admin_logs"("teamId");

-- Migration: pedidos de entrada em times e limite de tentativas de login.
-- Pode rodar mais de uma vez sem quebrar (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "join_requests" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "nickname" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "join_requests_teamId_userId_key" ON "join_requests"("teamId", "userId");
CREATE INDEX IF NOT EXISTS "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "login_attempts_ip_createdAt_idx" ON "login_attempts"("ip", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_teamId_fkey') THEN
    ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_userId_fkey') THEN
    ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

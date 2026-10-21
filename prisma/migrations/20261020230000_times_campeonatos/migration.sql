-- Migration: times, jogadores com conta, campeonatos e inscrições.
-- Escrita para poder rodar mais de uma vez sem quebrar (IF NOT EXISTS),
-- e para funcionar mesmo se já existirem times cadastrados.

-- ====== teams: código de convite ======
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

-- times que já existiam ganham um código gerado (8 caracteres, maiúsculos)
UPDATE "teams"
SET "inviteCode" = upper(substr(md5(random()::text || "id"), 1, 8))
WHERE "inviteCode" IS NULL;

ALTER TABLE "teams" ALTER COLUMN "inviteCode" SET NOT NULL;

-- ====== players: vínculo opcional com uma conta ======
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- ====== tournaments ======
CREATE TABLE IF NOT EXISTS "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "description" TEXT,
    "prize" INTEGER NOT NULL,
    "maxTeams" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- ====== registrations ======
CREATE TABLE IF NOT EXISTS "registrations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- ====== índices únicos ======
CREATE UNIQUE INDEX IF NOT EXISTS "teams_inviteCode_key" ON "teams"("inviteCode");
CREATE UNIQUE INDEX IF NOT EXISTS "players_teamId_userId_key" ON "players"("teamId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_name_key" ON "tournaments"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "registrations_teamId_tournamentId_key" ON "registrations"("teamId", "tournamentId");

-- ====== chaves estrangeiras ======
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_userId_fkey') THEN
    ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_teamId_fkey') THEN
    ALTER TABLE "registrations" ADD CONSTRAINT "registrations_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_tournamentId_fkey') THEN
    ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournamentId_fkey"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

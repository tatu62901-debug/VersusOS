-- Migration: campeonatos mais realistas (status, prazo de inscrição, aprovação de
-- inscrições e chaveamento mata-mata). Pode rodar mais de uma vez sem quebrar.

-- ====== tournaments ======
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'registrationDeadline') THEN
    ALTER TABLE "tournaments" ADD COLUMN "registrationDeadline" TIMESTAMP(3);
    -- campeonatos que já existiam: inscrições até 7 dias antes do início
    UPDATE "tournaments" SET "registrationDeadline" = "startDate" - INTERVAL '7 days';
    ALTER TABLE "tournaments" ALTER COLUMN "registrationDeadline" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'INSCRICOES';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "championName" TEXT;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "runnerUpName" TEXT;

-- ====== registrations ======
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'status') THEN
    ALTER TABLE "registrations" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDENTE';
    -- inscrições que já existiam são consideradas aprovadas
    UPDATE "registrations" SET "status" = 'APROVADA';
  END IF;
END $$;

-- ====== matches ======
CREATE TABLE IF NOT EXISTS "matches" (
    "id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "teamAId" TEXT,
    "teamAName" TEXT,
    "teamBId" TEXT,
    "teamBName" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "winnerSide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "matches_tournamentId_round_position_key" ON "matches"("tournamentId", "round", "position");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_tournamentId_fkey') THEN
    ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_teamAId_fkey') THEN
    ALTER TABLE "matches" ADD CONSTRAINT "matches_teamAId_fkey"
      FOREIGN KEY ("teamAId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_teamBId_fkey') THEN
    ALTER TABLE "matches" ADD CONSTRAINT "matches_teamBId_fkey"
      FOREIGN KEY ("teamBId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Additive migration preserves existing tasks and proposals.
-- Quote the JSON literal: Prisma 6's SQLite generator emits invalid DEFAULT {}.
ALTER TABLE "Task" ADD COLUMN "wizardState" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Task" ADD COLUMN "wizardRevision" INTEGER NOT NULL DEFAULT 0;

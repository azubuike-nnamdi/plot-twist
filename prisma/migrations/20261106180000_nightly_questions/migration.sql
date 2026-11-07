-- Rounds keep their own copy of the question, so questions can be deleted.
ALTER TABLE "Round" DROP CONSTRAINT "Round_questionId_fkey";

ALTER TABLE "Round" ADD COLUMN "questionPack" TEXT,
ADD COLUMN "questionText" TEXT;

-- Backfill the copy for every round dealt before this migration.
UPDATE "Round" AS r
SET "questionText" = q."text", "questionPack" = c."name"
FROM "Question" AS q
JOIN "Category" AS c ON c."id" = q."categoryId"
WHERE r."questionId" = q."id";

ALTER TABLE "Round" ADD CONSTRAINT "Round_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Nightly batches expire. Existing (seeded) questions are marked expired now,
-- so the first nightly Ollama batch for each pack replaces them.
ALTER TABLE "Question" ADD COLUMN "expiresAt" TIMESTAMP(3);
UPDATE "Question" SET "expiresAt" = CURRENT_TIMESTAMP;
CREATE INDEX "Question_expiresAt_idx" ON "Question"("expiresAt");

-- Fingerprints of generated questions, to avoid repeats across nights.
CREATE TABLE "QuestionFingerprint" (
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFingerprint_pkey" PRIMARY KEY ("hash")
);

CREATE INDEX "QuestionFingerprint_createdAt_idx" ON "QuestionFingerprint"("createdAt");

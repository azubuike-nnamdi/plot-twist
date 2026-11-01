CREATE TYPE "PromptStatus" AS ENUM ('PENDING', 'ACCEPTED', 'USED', 'REMOVED');

CREATE TABLE "RoomPrompt" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "PromptStatus" NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomPrompt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Round" ALTER COLUMN "questionId" DROP NOT NULL;
ALTER TABLE "Round" ADD COLUMN "roomPromptId" TEXT;
ALTER TABLE "Round" ADD COLUMN "isReplay" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Round_roomPromptId_key" ON "Round"("roomPromptId");
CREATE INDEX "RoomPrompt_roomId_status_idx" ON "RoomPrompt"("roomId", "status");
CREATE INDEX "RoomPrompt_playerId_idx" ON "RoomPrompt"("playerId");

ALTER TABLE "RoomPrompt" ADD CONSTRAINT "RoomPrompt_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomPrompt" ADD CONSTRAINT "RoomPrompt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "RoomPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Round" ADD CONSTRAINT "Round_roomPromptId_fkey" FOREIGN KEY ("roomPromptId") REFERENCES "RoomPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

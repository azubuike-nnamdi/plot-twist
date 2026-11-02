ALTER TABLE "PlatformSetting" ALTER COLUMN "minPlayers" SET DEFAULT 2;

UPDATE "PlatformSetting" SET "minPlayers" = 2 WHERE "minPlayers" = 3;

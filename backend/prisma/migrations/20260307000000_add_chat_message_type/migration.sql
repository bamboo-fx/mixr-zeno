-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "messageType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "ChatMessage" ADD COLUMN "changeRequestId" TEXT;

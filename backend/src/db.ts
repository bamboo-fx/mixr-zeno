import { PrismaClient } from "@prisma/client";

// schema v2: openMixerId + isOpen fields added to ChatRoom
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const safetyRouter = new Hono();

const blockSchema = z.object({
  blockerId: z.string(),
  blockedId: z.string(),
});

// POST /block — block a user
safetyRouter.post("/block", zValidator("json", blockSchema), async (c) => {
  try {
    const { blockerId, blockedId } = c.req.valid("json");
    const block = await db.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return c.json({ block }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to block user" }, 500);
  }
});

// DELETE /block — unblock a user
safetyRouter.delete("/block", zValidator("json", blockSchema), async (c) => {
  try {
    const { blockerId, blockedId } = c.req.valid("json");
    await db.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to unblock user" }, 500);
  }
});

// GET /blocks/:userId — get all blocks for a user
safetyRouter.get("/blocks/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const blocks = await db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      include: {
        blocker: true,
        blocked: true,
      },
    });
    return c.json({ blocks });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch blocks" }, 500);
  }
});

const reportSchema = z.object({
  reporterId: z.string(),
  reportedUserId: z.string().optional(),
  reason: z.string().min(1),
  details: z.string().optional(),
});

// POST /report — create a report
safetyRouter.post("/report", zValidator("json", reportSchema), async (c) => {
  try {
    const { reporterId, reportedUserId, reason, details } = c.req.valid("json");
    const report = await db.report.create({
      data: { reporterId, reportedUserId, reason, details },
      include: {
        reporter: true,
        reportedUser: true,
      },
    });
    return c.json({ report }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to create report" }, 500);
  }
});

export { safetyRouter };

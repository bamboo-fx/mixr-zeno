import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const notificationsRouter = new Hono();

// GET / — list notifications for a user
notificationsRouter.get("/", async (c) => {
  try {
    const userId = c.req.query("userId");
    const unreadOnly = c.req.query("unreadOnly") === "true";
    const limit = parseInt(c.req.query("limit") || "50", 10);

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const notifications = await db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return c.json({ notifications });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
});

// GET /unread-count — get unread notification count
notificationsRouter.get("/unread-count", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const count = await db.notification.count({
      where: { userId, read: false },
    });

    return c.json({ count });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get unread count" }, 500);
  }
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
  userId: z.string(),
});

// POST /mark-read — mark notifications as read
notificationsRouter.post("/mark-read", zValidator("json", markReadSchema), async (c) => {
  try {
    const { notificationIds, markAllRead, userId } = c.req.valid("json");

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (notificationIds && notificationIds.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { read: true },
      });
    }

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to mark notifications as read" }, 500);
  }
});

// DELETE /:id — delete a notification
notificationsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    await db.notification.delete({
      where: { id, userId },
    });

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to delete notification" }, 500);
  }
});

export { notificationsRouter };

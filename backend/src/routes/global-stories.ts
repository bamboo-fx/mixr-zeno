import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const globalStoriesRouter = new Hono();

// Storage directory for global stories
const STORAGE_DIR = path.join(process.cwd(), "uploads", "global-stories");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// ========================================
// GET /feed - Get global story feed for a college
// ========================================
globalStoriesRouter.get("/feed", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const userId = c.req.query("userId"); // For filtering out blocked users
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 100);
    const cursor = c.req.query("cursor"); // For pagination

    if (!collegeId) {
      return c.json({ error: "collegeId is required" }, 400);
    }

    const now = new Date();

    // Get blocked user IDs if userId provided
    let blockedIds: string[] = [];
    if (userId) {
      const blocks = await db.block.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: { blockerId: true, blockedId: true },
      });
      blockedIds = blocks.flatMap((b) => [b.blockerId, b.blockedId]);
    }

    // Get active stories (not expired, not deleted)
    const stories = await db.globalStory.findMany({
      where: {
        collegeId,
        expiresAt: { gt: now },
        isDeleted: false,
        uploaderId: { notIn: blockedIds.length > 0 ? blockedIds : undefined },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          select: {
            id: true,
            reactorId: true,
            reaction: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Group stories by user for display
    const userStories = new Map<string, typeof stories>();
    for (const story of stories) {
      const existing = userStories.get(story.uploaderId) ?? [];
      existing.push(story);
      userStories.set(story.uploaderId, existing);
    }

    // Format response
    const feed = Array.from(userStories.entries()).map(([uploaderId, userStoriesList]) => ({
      user: userStoriesList[0]?.uploader,
      stories: userStoriesList.map((s) => ({
        id: s.id,
        mediaUrl: `/uploads/global-stories/${path.basename(s.storagePath)}`,
        mediaType: s.mediaType,
        caption: s.caption,
        width: s.width,
        height: s.height,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        reactions: s.reactions,
        reactionCounts: {
          fire: s.reactions.filter((r) => r.reaction === "fire").length,
          party: s.reactions.filter((r) => r.reaction === "party").length,
          love: s.reactions.filter((r) => r.reaction === "love").length,
          laugh: s.reactions.filter((r) => r.reaction === "laugh").length,
          wow: s.reactions.filter((r) => r.reaction === "wow").length,
        },
      })),
      latestAt: userStoriesList[0]?.createdAt,
    }));

    // Sort by most recent story
    feed.sort((a, b) =>
      new Date(b.latestAt ?? 0).getTime() - new Date(a.latestAt ?? 0).getTime()
    );

    return c.json({
      feed,
      nextCursor: stories.length === limit ? stories[stories.length - 1]?.id : null,
    });
  } catch (err) {
    console.error("[GlobalStories] Feed error:", err);
    return c.json({ error: "Failed to fetch story feed" }, 500);
  }
});

// ========================================
// POST / - Upload a new global story
// ========================================
globalStoriesRouter.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const uploaderId = formData.get("uploaderId") as string | null;
    const collegeId = formData.get("collegeId") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !uploaderId || !collegeId) {
      return c.json({ error: "file, uploaderId, and collegeId are required" }, 400);
    }

    // Validate user exists and belongs to college
    const profile = await db.profile.findUnique({
      where: { id: uploaderId },
      select: { collegeId: true },
    });

    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    if (profile.collegeId !== collegeId) {
      return c.json({ error: "User does not belong to this college" }, 403);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV" }, 400);
    }

    // Validate file size (50MB max for videos, 10MB for images)
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: `File too large. Max: ${maxSize / 1024 / 1024}MB` }, 400);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = path.join(STORAGE_DIR, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    // Determine media type
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    // Create story record (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await db.globalStory.create({
      data: {
        collegeId,
        uploaderId,
        storagePath,
        mediaType,
        caption: caption ?? null,
        expiresAt,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return c.json({
      story: {
        id: story.id,
        mediaUrl: `/uploads/global-stories/${filename}`,
        mediaType: story.mediaType,
        caption: story.caption,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
        uploader: story.uploader,
      },
    }, 201);
  } catch (err) {
    console.error("[GlobalStories] Upload error:", err);
    return c.json({ error: "Failed to upload story" }, 500);
  }
});

// ========================================
// DELETE /:id - Delete a story
// ========================================
globalStoriesRouter.delete("/:id", async (c) => {
  try {
    const storyId = c.req.param("id");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const story = await db.globalStory.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    // Only the uploader can delete their story
    if (story.uploaderId !== userId) {
      return c.json({ error: "Only the uploader can delete this story" }, 403);
    }

    // Soft delete
    await db.globalStory.update({
      where: { id: storyId },
      data: { isDeleted: true },
    });

    return c.json({ success: true });
  } catch (err) {
    console.error("[GlobalStories] Delete error:", err);
    return c.json({ error: "Failed to delete story" }, 500);
  }
});

// ========================================
// POST /:id/react - React to a story
// ========================================
const reactSchema = z.object({
  reactorId: z.string(),
  reaction: z.enum(["fire", "party", "love", "laugh", "wow"]),
});

globalStoriesRouter.post(
  "/:id/react",
  zValidator("json", reactSchema),
  async (c) => {
    try {
      const storyId = c.req.param("id");
      const { reactorId, reaction } = c.req.valid("json");

      const story = await db.globalStory.findUnique({
        where: { id: storyId },
      });

      if (!story || story.isDeleted) {
        return c.json({ error: "Story not found" }, 404);
      }

      // Check if already reacted with this reaction
      const existing = await db.globalStoryReaction.findUnique({
        where: {
          storyId_reactorId_reaction: { storyId, reactorId, reaction },
        },
      });

      if (existing) {
        // Remove reaction (toggle off)
        await db.globalStoryReaction.delete({
          where: { id: existing.id },
        });
        return c.json({ action: "removed", reaction });
      }

      // Add reaction
      await db.globalStoryReaction.create({
        data: { storyId, reactorId, reaction },
      });

      return c.json({ action: "added", reaction });
    } catch (err) {
      console.error("[GlobalStories] React error:", err);
      return c.json({ error: "Failed to react to story" }, 500);
    }
  }
);

// ========================================
// GET /my - Get current user's stories
// ========================================
globalStoriesRouter.get("/my", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const now = new Date();

    const stories = await db.globalStory.findMany({
      where: {
        uploaderId: userId,
        expiresAt: { gt: now },
        isDeleted: false,
      },
      include: {
        reactions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      stories: stories.map((s) => ({
        id: s.id,
        mediaUrl: `/uploads/global-stories/${path.basename(s.storagePath)}`,
        mediaType: s.mediaType,
        caption: s.caption,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        reactionCounts: {
          fire: s.reactions.filter((r) => r.reaction === "fire").length,
          party: s.reactions.filter((r) => r.reaction === "party").length,
          love: s.reactions.filter((r) => r.reaction === "love").length,
          laugh: s.reactions.filter((r) => r.reaction === "laugh").length,
          wow: s.reactions.filter((r) => r.reaction === "wow").length,
        },
      })),
    });
  } catch (err) {
    console.error("[GlobalStories] My stories error:", err);
    return c.json({ error: "Failed to fetch your stories" }, 500);
  }
});

// ========================================
// GET /user/:userId - Get a specific user's stories
// ========================================
globalStoriesRouter.get("/user/:userId", async (c) => {
  try {
    const targetUserId = c.req.param("userId");
    const viewerId = c.req.query("viewerId");

    const now = new Date();

    // Check if viewer is blocked
    if (viewerId) {
      const blocked = await db.block.findFirst({
        where: {
          OR: [
            { blockerId: targetUserId, blockedId: viewerId },
            { blockerId: viewerId, blockedId: targetUserId },
          ],
        },
      });
      if (blocked) {
        return c.json({ stories: [] });
      }
    }

    const stories = await db.globalStory.findMany({
      where: {
        uploaderId: targetUserId,
        expiresAt: { gt: now },
        isDeleted: false,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      user: stories[0]?.uploader ?? null,
      stories: stories.map((s) => ({
        id: s.id,
        mediaUrl: `/uploads/global-stories/${path.basename(s.storagePath)}`,
        mediaType: s.mediaType,
        caption: s.caption,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        reactionCounts: {
          fire: s.reactions.filter((r) => r.reaction === "fire").length,
          party: s.reactions.filter((r) => r.reaction === "party").length,
          love: s.reactions.filter((r) => r.reaction === "love").length,
          laugh: s.reactions.filter((r) => r.reaction === "laugh").length,
          wow: s.reactions.filter((r) => r.reaction === "wow").length,
        },
      })),
    });
  } catch (err) {
    console.error("[GlobalStories] User stories error:", err);
    return c.json({ error: "Failed to fetch user stories" }, 500);
  }
});

export { globalStoriesRouter };

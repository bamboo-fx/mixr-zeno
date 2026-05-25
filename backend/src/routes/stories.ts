import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import * as fs from "fs";
import * as path from "path";

const storiesRouter = new Hono();

// Helper: Check if user is a participant with RSVP 'going'
async function isMixerParticipant(userId: string, mixerId: string): Promise<boolean> {
  const participant = await db.mixerParticipant.findFirst({
    where: {
      userId,
      mixerId,
      rsvpStatus: "going",
    },
  });
  return !!participant;
}

// Helper: Check if within posting window
// Posting allowed ONLY when mixer.status = 'live', from scheduled_start until 2:00 AM next day
async function isWithinPostingWindow(mixerId: string): Promise<boolean> {
  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
  });

  if (!mixer || mixer.status !== "live") {
    return false;
  }

  const now = new Date();
  const scheduledStart = new Date(mixer.scheduledStart);

  // Calculate next day 2 AM
  const nextDay2AM = new Date(scheduledStart);
  nextDay2AM.setDate(nextDay2AM.getDate() + 1);
  nextDay2AM.setHours(2, 0, 0, 0);

  return now >= scheduledStart && now <= nextDay2AM;
}

// Helper: Check if user is social chair of a group
async function isSocialChairOfGroup(userId: string, groupId: string): Promise<boolean> {
  const member = await db.groupMember.findFirst({
    where: {
      userId,
      groupId,
      role: { in: ["social_chair", "admin"] },
    },
  });
  return !!member;
}

// GET /feed - Get story feed for user's college
// Groups stories by mixer, returns active (non-expired, non-deleted) stories
storiesRouter.get("/feed", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const userId = c.req.query("userId");

    if (!collegeId) {
      return c.json({ error: "collegeId query param is required" }, 400);
    }

    const now = new Date();

    // Get all active stories for this college, grouped by mixer
    const stories = await db.mixerStory.findMany({
      where: {
        collegeId,
        isDeleted: false,
        expiresAt: { gt: now },
      },
      include: {
        mixer: {
          include: {
            groupA: true,
            groupB: true,
            activity: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get blocked user IDs to filter out their stories
    let blockedIds: string[] = [];
    if (userId) {
      const blocks = await db.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });
      blockedIds = blocks.flatMap(b => [b.blockerId, b.blockedId]).filter(id => id !== userId);
    }

    // Filter out blocked users' stories
    const filteredStories = stories.filter(s => !blockedIds.includes(s.uploaderId));

    // Group by mixer
    const mixerStoryMap = new Map<string, typeof filteredStories>();
    for (const story of filteredStories) {
      const existing = mixerStoryMap.get(story.mixerId) || [];
      existing.push(story);
      mixerStoryMap.set(story.mixerId, existing);
    }

    // Transform to feed format
    const feed = Array.from(mixerStoryMap.entries()).map(([mixerId, mixerStories]) => {
      const firstStory = mixerStories[0]!;
      const latestStory = mixerStories.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      );

      return {
        mixerId,
        groupAName: firstStory.mixer.groupA.name,
        groupBName: firstStory.mixer.groupB.name,
        activityName: firstStory.mixer.activity?.name || null,
        latestCreatedAt: latestStory.createdAt,
        storyCount: mixerStories.length,
        thumbnailPath: firstStory.storagePath,
        stories: mixerStories.map(s => ({
          id: s.id,
          storagePath: s.storagePath,
          mediaType: s.mediaType,
          width: s.width,
          height: s.height,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          uploader: s.uploader,
          group: s.group,
        })),
      };
    });

    // Sort by most recent story
    feed.sort((a, b) =>
      new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
    );

    return c.json({ feed });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch story feed" }, 500);
  }
});

// GET /mixer/:mixerId - Get all stories for a specific mixer
storiesRouter.get("/mixer/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");
    const now = new Date();

    // Get blocked user IDs
    let blockedIds: string[] = [];
    if (userId) {
      const blocks = await db.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });
      blockedIds = blocks.flatMap(b => [b.blockerId, b.blockedId]).filter(id => id !== userId);
    }

    const stories = await db.mixerStory.findMany({
      where: {
        mixerId,
        isDeleted: false,
        expiresAt: { gt: now },
        uploaderId: { notIn: blockedIds },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return c.json({ stories });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch mixer stories" }, 500);
  }
});

// POST /upload - Upload a new story
storiesRouter.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const mixerId = formData.get("mixerId") as string | null;
    const uploaderId = formData.get("uploaderId") as string | null;
    const groupId = formData.get("groupId") as string | null;
    const width = formData.get("width") as string | null;
    const height = formData.get("height") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !mixerId || !uploaderId || !groupId) {
      return c.json({ error: "file, mixerId, uploaderId, and groupId are required" }, 400);
    }

    // File size validation (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File too large. Maximum size is 50MB" }, 400);
    }

    // File type validation
    const ALLOWED_TYPES = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/quicktime", "video/mov", "video/webm"
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({
        error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM"
      }, 400);
    }

    // Role check: only admin or social_chair of the group can post
    const isAuthorized = await isSocialChairOfGroup(uploaderId, groupId);
    if (!isAuthorized) {
      return c.json({ error: "Only admins and social chairs can post mixer stories" }, 403);
    }

    // Verify user is a participant
    const isParticipant = await isMixerParticipant(uploaderId, mixerId);
    if (!isParticipant) {
      return c.json({ error: "Only mixer participants can post stories" }, 403);
    }

    // Verify within posting window
    const inWindow = await isWithinPostingWindow(mixerId);
    if (!inWindow) {
      return c.json({
        error: "Stories can only be posted while the mixer is live (until 2AM)"
      }, 403);
    }

    // Enforce one story per group per mixer
    const existingStory = await db.mixerStory.findFirst({
      where: { mixerId, groupId, isDeleted: false },
    });
    if (existingStory) {
      return c.json({ error: "Your group has already posted a story for this mixer" }, 409);
    }

    // Get mixer to get collegeId
    const mixer = await db.mixer.findUnique({ where: { id: mixerId } });
    if (!mixer) {
      return c.json({ error: "Mixer not found" }, 404);
    }

    // Verify user's college matches mixer's college
    const profile = await db.profile.findUnique({ where: { id: uploaderId } });
    if (!profile || profile.collegeId !== mixer.collegeId) {
      return c.json({ error: "User must be from the same college" }, 403);
    }

    // Save file to disk
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const filename = `${Date.now()}-${uploaderId.replace(/[^a-zA-Z0-9-]/g, "")}.${ext}`;
    const storagePath = `uploads/stories/${filename}`;
    const fullPath = path.join(process.cwd(), storagePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(fullPath, buffer);

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create story record
    const story = await db.mixerStory.create({
      data: {
        collegeId: mixer.collegeId,
        mixerId,
        uploaderId,
        groupId,
        storagePath,
        caption: caption?.trim() || null,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        width: width ? parseInt(width, 10) : null,
        height: height ? parseInt(height, 10) : null,
        expiresAt,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return c.json({ story }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to upload story" }, 500);
  }
});

const deleteStorySchema = z.object({
  userId: z.string(),
});

// DELETE /:id - Soft delete a story
storiesRouter.delete(
  "/:id",
  zValidator("json", deleteStorySchema),
  async (c) => {
    try {
      const storyId = c.req.param("id");
      const { userId } = c.req.valid("json");

      const story = await db.mixerStory.findUnique({
        where: { id: storyId },
        include: { mixer: true },
      });

      if (!story) {
        return c.json({ error: "Story not found" }, 404);
      }

      // Check if user is the uploader
      const isUploader = story.uploaderId === userId;

      // Check if user is social chair of either group in the mixer
      const isSocialChairA = await isSocialChairOfGroup(userId, story.mixer.groupAId);
      const isSocialChairB = await isSocialChairOfGroup(userId, story.mixer.groupBId);

      if (!isUploader && !isSocialChairA && !isSocialChairB) {
        return c.json({ error: "Not authorized to delete this story" }, 403);
      }

      // 5-minute delete window — stories cannot be removed after that.
      // Social chairs of either group can still delete (moderation safety valve).
      const ageMs = Date.now() - new Date(story.createdAt).getTime();
      const FIVE_MIN = 5 * 60 * 1000;
      if (isUploader && !isSocialChairA && !isSocialChairB && ageMs > FIVE_MIN) {
        return c.json({
          error: "Stories can only be deleted within 5 minutes of posting.",
        }, 403);
      }

      // Soft delete
      await db.mixerStory.update({
        where: { id: storyId },
        data: { isDeleted: true },
      });

      return c.json({ success: true });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to delete story" }, 500);
    }
  }
);

// GET /can-post - Check if user can post to any mixer (admin/social_chair only)
storiesRouter.get("/can-post", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId query param is required" }, 400);
    }

    // Find all mixers where user is a participant with 'going' status
    const participations = await db.mixerParticipant.findMany({
      where: {
        userId,
        rsvpStatus: "going",
      },
      include: {
        mixer: true,
        group: true,
      },
    });

    // Check which mixers are within posting window AND user has admin/social_chair role
    const postableMixers = [];
    for (const p of participations) {
      const inWindow = await isWithinPostingWindow(p.mixerId);
      if (!inWindow) continue;

      // Only allow admin/social_chair to post
      const isAuthorized = await isSocialChairOfGroup(userId, p.groupId);
      if (!isAuthorized) continue;

      // Check if this group has already posted a story for this mixer
      const existingStory = await db.mixerStory.findFirst({
        where: { mixerId: p.mixerId, groupId: p.groupId, isDeleted: false },
      });

      postableMixers.push({
        mixerId: p.mixerId,
        groupId: p.groupId,
        mixerStatus: p.mixer.status,
        scheduledStart: p.mixer.scheduledStart,
        groupName: p.group.name,
        hasPosted: !!existingStory,
      });
    }

    return c.json({
      canPost: postableMixers.length > 0,
      postableMixers,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to check posting status" }, 500);
  }
});

// Serve uploaded files
storiesRouter.get("/file/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");
    const filePath = path.join(process.cwd(), "uploads/stories", filename);

    if (!fs.existsSync(filePath)) {
      return c.json({ error: "File not found" }, 404);
    }

    const file = fs.readFileSync(filePath);
    const ext = filename.split(".").pop()?.toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "webp") contentType = "image/webp";
    else if (ext === "mp4") contentType = "video/mp4";
    else if (ext === "mov") contentType = "video/quicktime";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

// POST /cleanup - Clean up expired stories (can be called by cron)
storiesRouter.post("/cleanup", async (c) => {
  try {
    const now = new Date();

    // Mark expired stories as deleted
    const result = await db.mixerStory.updateMany({
      where: {
        expiresAt: { lt: now },
        isDeleted: false,
      },
      data: { isDeleted: true },
    });

    // Optionally delete storage files for stories older than 48 hours
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);

    const oldStories = await db.mixerStory.findMany({
      where: {
        isDeleted: true,
        expiresAt: { lt: cutoff },
      },
      select: { id: true, storagePath: true },
    });

    let filesDeleted = 0;
    for (const story of oldStories) {
      const fullPath = path.join(process.cwd(), story.storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        filesDeleted++;
      }
    }

    // Delete the DB records for cleaned up stories
    await db.mixerStory.deleteMany({
      where: {
        id: { in: oldStories.map(s => s.id) },
      },
    });

    return c.json({
      markedDeleted: result.count,
      filesDeleted,
      recordsRemoved: oldStories.length,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to cleanup stories" }, 500);
  }
});

export { storiesRouter };

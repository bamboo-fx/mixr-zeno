import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import * as fs from "fs";
import * as path from "path";

const highlightsRouter = new Hono();

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

// Ensure highlights directory exists
const HIGHLIGHTS_DIR = path.join(process.cwd(), "uploads/highlights");
if (!fs.existsSync(HIGHLIGHTS_DIR)) {
  fs.mkdirSync(HIGHLIGHTS_DIR, { recursive: true });
}

// GET /group/:groupId - Get all highlights for a group
highlightsRouter.get("/group/:groupId", async (c) => {
  try {
    const groupId = c.req.param("groupId");

    const highlights = await db.groupHighlight.findMany({
      where: {
        groupId,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        coverStory: {
          select: { storagePath: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return c.json({ highlights });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get highlights" }, 500);
  }
});

// GET /:id - Get a single highlight with items
highlightsRouter.get("/:id", async (c) => {
  try {
    const highlightId = c.req.param("id");

    const highlight = await db.groupHighlight.findUnique({
      where: { id: highlightId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            sourceStory: {
              select: {
                id: true,
                mediaType: true,
                width: true,
                height: true,
                createdAt: true,
                uploader: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
        group: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!highlight || highlight.isDeleted) {
      return c.json({ error: "Highlight not found" }, 404);
    }

    return c.json({ highlight });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get highlight" }, 500);
  }
});

const createHighlightSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  mixerId: z.string(),
  title: z.string().min(1).max(100),
  storyIds: z.array(z.string()).min(1),
});

// POST /create - Create highlight from mixer stories
highlightsRouter.post(
  "/create",
  zValidator("json", createHighlightSchema),
  async (c) => {
    try {
      const { userId, groupId, mixerId, title, storyIds } = c.req.valid("json");

      // Verify user is social chair of the group
      const isSocialChair = await isSocialChairOfGroup(userId, groupId);
      if (!isSocialChair) {
        return c.json({ error: "Only social chairs can create highlights" }, 403);
      }

      // Verify group participated in the mixer
      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
      });

      if (!mixer) {
        return c.json({ error: "Mixer not found" }, 404);
      }

      if (mixer.groupAId !== groupId && mixer.groupBId !== groupId) {
        return c.json({ error: "Group did not participate in this mixer" }, 403);
      }

      // Get the stories
      const stories = await db.mixerStory.findMany({
        where: {
          id: { in: storyIds },
          mixerId,
          isDeleted: false,
        },
      });

      if (stories.length === 0) {
        return c.json({ error: "No valid stories found" }, 400);
      }

      // Get group's collegeId
      const group = await db.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return c.json({ error: "Group not found" }, 404);
      }

      // Create highlight
      const highlight = await db.groupHighlight.create({
        data: {
          collegeId: group.collegeId,
          groupId,
          title,
          createdById: userId,
          coverStoryItemId: stories[0]?.id,
        },
      });

      // Copy story media to highlights folder and create items
      const items = [];
      for (const story of stories) {
        const sourceFile = path.join(process.cwd(), story.storagePath);
        const ext = story.storagePath.split(".").pop() || "jpg";
        const newFilename = `${highlight.id}-${story.id}.${ext}`;
        const newPath = `uploads/highlights/${newFilename}`;
        const destFile = path.join(process.cwd(), newPath);

        // Copy file if source exists
        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, destFile);
        }

        const item = await db.groupHighlightItem.create({
          data: {
            highlightId: highlight.id,
            storagePath: newPath,
            sourceStoryId: story.id,
          },
        });
        items.push(item);
      }

      return c.json({
        highlight: {
          ...highlight,
          items,
        },
      }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create highlight" }, 500);
    }
  }
);

const updateHighlightSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(100).optional(),
});

// PATCH /:id - Update highlight title
highlightsRouter.patch(
  "/:id",
  zValidator("json", updateHighlightSchema),
  async (c) => {
    try {
      const highlightId = c.req.param("id");
      const { userId, title } = c.req.valid("json");

      const highlight = await db.groupHighlight.findUnique({
        where: { id: highlightId },
      });

      if (!highlight || highlight.isDeleted) {
        return c.json({ error: "Highlight not found" }, 404);
      }

      // Verify user is social chair
      const isSocialChair = await isSocialChairOfGroup(userId, highlight.groupId);
      if (!isSocialChair) {
        return c.json({ error: "Only social chairs can edit highlights" }, 403);
      }

      const updated = await db.groupHighlight.update({
        where: { id: highlightId },
        data: { title },
      });

      return c.json({ highlight: updated });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update highlight" }, 500);
    }
  }
);

const deleteHighlightSchema = z.object({
  userId: z.string(),
});

// DELETE /:id - Soft delete a highlight
highlightsRouter.delete(
  "/:id",
  zValidator("json", deleteHighlightSchema),
  async (c) => {
    try {
      const highlightId = c.req.param("id");
      const { userId } = c.req.valid("json");

      const highlight = await db.groupHighlight.findUnique({
        where: { id: highlightId },
      });

      if (!highlight || highlight.isDeleted) {
        return c.json({ error: "Highlight not found" }, 404);
      }

      // Verify user is social chair
      const isSocialChair = await isSocialChairOfGroup(userId, highlight.groupId);
      if (!isSocialChair) {
        return c.json({ error: "Only social chairs can delete highlights" }, 403);
      }

      await db.groupHighlight.update({
        where: { id: highlightId },
        data: { isDeleted: true },
      });

      return c.json({ success: true });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to delete highlight" }, 500);
    }
  }
);

// GET /file/:filename - Serve highlight media files
highlightsRouter.get("/file/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");
    const filePath = path.join(HIGHLIGHTS_DIR, filename);

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
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

// GET /mixers/:groupId - Get past mixers for a group (for highlight creation)
highlightsRouter.get("/mixers/:groupId", async (c) => {
  try {
    const groupId = c.req.param("groupId");

    const mixers = await db.mixer.findMany({
      where: {
        OR: [{ groupAId: groupId }, { groupBId: groupId }],
        status: { in: ["completed", "live", "locked"] },
      },
      orderBy: { scheduledStart: "desc" },
      take: 20,
      include: {
        groupA: { select: { id: true, name: true } },
        groupB: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
        _count: {
          select: {
            mixerStories: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    return c.json({
      mixers: mixers.map((m) => ({
        id: m.id,
        groupA: m.groupA,
        groupB: m.groupB,
        activity: m.activity,
        scheduledStart: m.scheduledStart,
        status: m.status,
        storyCount: m._count.mixerStories,
      })),
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get mixers" }, 500);
  }
});

// GET /stories/:mixerId - Get stories for a mixer (for highlight creation picker)
highlightsRouter.get("/stories/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");

    const stories = await db.mixerStory.findMany({
      where: {
        mixerId,
        isDeleted: false,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        storagePath: true,
        mediaType: true,
        width: true,
        height: true,
        createdAt: true,
        uploader: {
          select: { id: true, name: true, avatarUrl: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return c.json({ stories });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get stories" }, 500);
  }
});

export { highlightsRouter };

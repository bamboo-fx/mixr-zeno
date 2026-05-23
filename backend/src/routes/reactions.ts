import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const reactionsRouter = new Hono();

const VALID_REACTIONS = ["fire", "party", "love"] as const;

const reactSchema = z.object({
  storyId: z.string(),
  reactorId: z.string(),
  reaction: z.enum(VALID_REACTIONS),
});

// POST /toggle - Toggle a reaction (add or remove)
reactionsRouter.post(
  "/toggle",
  zValidator("json", reactSchema),
  async (c) => {
    try {
      const { storyId, reactorId, reaction } = c.req.valid("json");

      // Get story to verify it exists and get collegeId
      const story = await db.mixerStory.findUnique({
        where: { id: storyId },
      });

      if (!story) {
        return c.json({ error: "Story not found" }, 404);
      }

      // Verify story is visible (not deleted, not expired)
      const now = new Date();
      if (story.isDeleted || story.expiresAt < now) {
        return c.json({ error: "Story is no longer available" }, 400);
      }

      // Verify reactor is from the same college
      const reactor = await db.profile.findUnique({
        where: { id: reactorId },
      });

      if (!reactor || reactor.collegeId !== story.collegeId) {
        return c.json({ error: "Not authorized to react to this story" }, 403);
      }

      // Check if reaction exists
      const existingReaction = await db.storyReaction.findUnique({
        where: {
          storyId_reactorId_reaction: {
            storyId,
            reactorId,
            reaction,
          },
        },
      });

      if (existingReaction) {
        // Remove reaction (unreact)
        await db.storyReaction.delete({
          where: { id: existingReaction.id },
        });
        return c.json({ action: "removed", reaction });
      } else {
        // Add reaction
        const newReaction = await db.storyReaction.create({
          data: {
            collegeId: story.collegeId,
            storyId,
            reactorId,
            reaction,
          },
        });
        return c.json({ action: "added", reaction, id: newReaction.id });
      }
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to toggle reaction" }, 500);
    }
  }
);

// GET /summary/:storyId - Get reaction summary for a story
reactionsRouter.get("/summary/:storyId", async (c) => {
  try {
    const storyId = c.req.param("storyId");
    const userId = c.req.query("userId");

    // Get counts for each reaction type
    const reactions = await db.storyReaction.groupBy({
      by: ["reaction"],
      where: { storyId },
      _count: { id: true },
    });

    const counts: Record<string, number> = {
      fire: 0,
      party: 0,
      love: 0,
    };

    for (const r of reactions) {
      counts[r.reaction] = r._count.id;
    }

    // Check if current user has reacted
    let userReactions: string[] = [];
    if (userId) {
      const userReactionRecords = await db.storyReaction.findMany({
        where: { storyId, reactorId: userId },
        select: { reaction: true },
      });
      userReactions = userReactionRecords.map((r) => r.reaction);
    }

    return c.json({
      counts,
      total: (counts.fire ?? 0) + (counts.party ?? 0) + (counts.love ?? 0),
      userReactions,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get reaction summary" }, 500);
  }
});

// GET /mixer/:mixerId - Get all reactions for all stories in a mixer
reactionsRouter.get("/mixer/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");

    // Get all stories for this mixer
    const stories = await db.mixerStory.findMany({
      where: { mixerId, isDeleted: false },
      select: { id: true },
    });

    const storyIds = stories.map((s) => s.id);

    // Get all reactions grouped by story and reaction type
    const reactions = await db.storyReaction.groupBy({
      by: ["storyId", "reaction"],
      where: { storyId: { in: storyIds } },
      _count: { id: true },
    });

    // Get user's reactions if userId provided
    let userReactions: { storyId: string; reaction: string }[] = [];
    if (userId) {
      userReactions = await db.storyReaction.findMany({
        where: {
          storyId: { in: storyIds },
          reactorId: userId,
        },
        select: { storyId: true, reaction: true },
      });
    }

    // Build summary by story
    const summaryByStory: Record<
      string,
      { counts: Record<string, number>; userReactions: string[] }
    > = {};

    for (const storyId of storyIds) {
      summaryByStory[storyId] = {
        counts: { fire: 0, party: 0, love: 0 },
        userReactions: [],
      };
    }

    for (const r of reactions) {
      const summary = summaryByStory[r.storyId];
      if (summary) {
        summary.counts[r.reaction] = r._count.id;
      }
    }

    for (const ur of userReactions) {
      const summary = summaryByStory[ur.storyId];
      if (summary) {
        summary.userReactions.push(ur.reaction);
      }
    }

    return c.json({ summaryByStory });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get mixer reactions" }, 500);
  }
});

export { reactionsRouter };

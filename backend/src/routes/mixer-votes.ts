import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import { OPTIONS_BY_KIND, isValidOption, type VoteKind } from "../lib/vote-options.js";

const mixerVotesRouter = new Hono();

const KINDS = ["theme", "activity"] as const satisfies readonly VoteKind[];

// GET /:mixerId — returns options + tallies for both kinds. If userId query
// is provided, also returns that user's current vote per kind.
mixerVotesRouter.get("/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");

    const mixer = await db.mixer.findUnique({ where: { id: mixerId }, select: { id: true } });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);

    const allVotes = await db.mixerVote.findMany({
      where: { mixerId },
      select: { kind: true, optionId: true, userId: true },
    });

    const result: Record<VoteKind, {
      options: { id: string; name: string; subtitle: string; emoji: string; votes: number }[];
      totalVotes: number;
      myVote: string | null;
    }> = {
      theme: { options: [], totalVotes: 0, myVote: null },
      activity: { options: [], totalVotes: 0, myVote: null },
    };

    for (const kind of KINDS) {
      const kindVotes = allVotes.filter((v) => v.kind === kind);
      const tally = new Map<string, number>();
      for (const v of kindVotes) tally.set(v.optionId, (tally.get(v.optionId) ?? 0) + 1);
      result[kind].options = OPTIONS_BY_KIND[kind].map((o) => ({
        ...o,
        votes: tally.get(o.id) ?? 0,
      }));
      result[kind].totalVotes = kindVotes.length;
      result[kind].myVote = userId
        ? kindVotes.find((v) => v.userId === userId)?.optionId ?? null
        : null;
    }

    return c.json(result);
  } catch (err) {
    console.error("[mixer-votes] GET failed", err);
    return c.json({ error: "Failed to fetch votes" }, 500);
  }
});

// POST /:mixerId — cast or swap a vote. Body: { userId, kind, optionId }.
mixerVotesRouter.post(
  "/:mixerId",
  zValidator(
    "json",
    z.object({
      userId: z.string().min(1),
      kind: z.enum(["theme", "activity"]),
      optionId: z.string().min(1),
    })
  ),
  async (c) => {
    try {
      const mixerId = c.req.param("mixerId");
      const { userId, kind, optionId } = c.req.valid("json");

      if (!isValidOption(kind, optionId)) {
        return c.json({ error: "Invalid optionId for this kind" }, 400);
      }

      const mixer = await db.mixer.findUnique({ where: { id: mixerId }, select: { id: true } });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      const vote = await db.mixerVote.upsert({
        where: { mixerId_userId_kind: { mixerId, userId, kind } },
        create: { mixerId, userId, kind, optionId },
        update: { optionId },
      });

      return c.json({ vote });
    } catch (err) {
      console.error("[mixer-votes] POST failed", err);
      return c.json({ error: "Failed to cast vote" }, 500);
    }
  }
);

// DELETE /:mixerId — remove user's vote for a given kind. Query: userId, kind.
mixerVotesRouter.delete("/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");
    const kind = c.req.query("kind") as VoteKind | undefined;

    if (!userId) return c.json({ error: "userId is required" }, 400);
    if (!kind || !KINDS.includes(kind)) return c.json({ error: "kind must be theme or activity" }, 400);

    await db.mixerVote.deleteMany({ where: { mixerId, userId, kind } });
    return c.json({ ok: true });
  } catch (err) {
    console.error("[mixer-votes] DELETE failed", err);
    return c.json({ error: "Failed to remove vote" }, 500);
  }
});

export { mixerVotesRouter };

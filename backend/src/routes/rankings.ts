import { Hono } from "hono";
import { db } from "../db.js";

const rankingsRouter = new Hono();

// Helper: Get start of current week (Monday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Compute mixer score
interface MixerScoreBreakdown {
  storyPosts: number;
  totalReactions: number;
  uniqueReactors: number;
  avgConversationRating: number;
  wouldMixAgainRate: number;
  rawScore: number;
}

async function computeMixerScore(mixerId: string): Promise<MixerScoreBreakdown> {
  // Get story posts count
  const storyPosts = await db.mixerStory.count({
    where: { mixerId, isDeleted: false },
  });

  // Get total reactions
  const stories = await db.mixerStory.findMany({
    where: { mixerId, isDeleted: false },
    select: { id: true },
  });
  const storyIds = stories.map((s) => s.id);

  const totalReactions = await db.storyReaction.count({
    where: { storyId: { in: storyIds } },
  });

  // Get unique reactors
  const uniqueReactorsResult = await db.storyReaction.groupBy({
    by: ["reactorId"],
    where: { storyId: { in: storyIds } },
  });
  const uniqueReactors = uniqueReactorsResult.length;

  // Get feedback stats
  const feedbacks = await db.mixerFeedback.findMany({
    where: { mixerId },
    select: { conversationRating: true, wouldMixAgain: true },
  });

  let avgConversationRating = 0;
  let wouldMixAgainRate = 0;

  if (feedbacks.length > 0) {
    const conversationRatings = feedbacks
      .map((f) => f.conversationRating)
      .filter((r): r is number => r !== null);
    if (conversationRatings.length > 0) {
      avgConversationRating =
        conversationRatings.reduce((a, b) => a + b, 0) / conversationRatings.length;
    }

    const wouldMixAgainResponses = feedbacks
      .map((f) => f.wouldMixAgain)
      .filter((r): r is boolean => r !== null);
    if (wouldMixAgainResponses.length > 0) {
      wouldMixAgainRate =
        wouldMixAgainResponses.filter((r) => r).length / wouldMixAgainResponses.length;
    }
  }

  // Compute score using formula:
  // score = (story_posts*2) + (total_reactions*1.5) + (unique_reactors*2) + (avg_feedback_conversation*3) + (would_mix_again_rate*4)
  const rawScore =
    storyPosts * 2 +
    totalReactions * 1.5 +
    uniqueReactors * 2 +
    avgConversationRating * 3 +
    wouldMixAgainRate * 4;

  return {
    storyPosts,
    totalReactions,
    uniqueReactors,
    avgConversationRating,
    wouldMixAgainRate,
    rawScore,
  };
}

// POST /compute - Compute weekly rankings (cron-ready)
rankingsRouter.post("/compute", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const weekStart = getWeekStart();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get colleges to process
    const colleges = collegeId
      ? await db.college.findMany({ where: { id: collegeId } })
      : await db.college.findMany();

    const results = [];

    for (const college of colleges) {
      // Get mixers for this college in the last 7 days
      // Prefer completed, but include live/locked
      const mixers = await db.mixer.findMany({
        where: {
          collegeId: college.id,
          status: { in: ["completed", "live", "locked"] },
          OR: [
            { completedAt: { gte: sevenDaysAgo } },
            { liveStartedAt: { gte: sevenDaysAgo } },
            { scheduledStart: { gte: sevenDaysAgo } },
          ],
        },
      });

      // Compute scores for each mixer
      const scoredMixers: { mixerId: string; score: number; breakdown: MixerScoreBreakdown }[] = [];

      for (const mixer of mixers) {
        const breakdown = await computeMixerScore(mixer.id);
        scoredMixers.push({
          mixerId: mixer.id,
          score: breakdown.rawScore,
          breakdown,
        });
      }

      // Sort by score descending
      scoredMixers.sort((a, b) => b.score - a.score);

      // Insert/update rankings
      for (let i = 0; i < scoredMixers.length; i++) {
        const sm = scoredMixers[i];
        if (!sm) continue;

        await db.weeklyMixerRanking.upsert({
          where: {
            collegeId_weekStart_mixerId: {
              collegeId: college.id,
              weekStart,
              mixerId: sm.mixerId,
            },
          },
          create: {
            collegeId: college.id,
            weekStart,
            mixerId: sm.mixerId,
            score: sm.score,
            breakdown: JSON.stringify(sm.breakdown),
            rank: i + 1,
          },
          update: {
            score: sm.score,
            breakdown: JSON.stringify(sm.breakdown),
            rank: i + 1,
          },
        });
      }

      results.push({
        collegeId: college.id,
        collegeName: college.name,
        mixersRanked: scoredMixers.length,
      });
    }

    return c.json({ success: true, results, weekStart });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to compute rankings" }, 500);
  }
});

// GET /top - Get top mixer for current week
rankingsRouter.get("/top", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");

    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const weekStart = getWeekStart();

    const topRanking = await db.weeklyMixerRanking.findFirst({
      where: {
        collegeId,
        weekStart,
        rank: 1,
      },
      include: {
        mixer: {
          include: {
            groupA: { select: { id: true, name: true, coverImageUrl: true } },
            groupB: { select: { id: true, name: true, coverImageUrl: true } },
            activity: { select: { id: true, name: true, energyLevel: true } },
          },
        },
      },
    });

    if (!topRanking) {
      return c.json({ topMixer: null });
    }

    return c.json({
      topMixer: {
        mixerId: topRanking.mixerId,
        rank: topRanking.rank,
        score: topRanking.score,
        breakdown: JSON.parse(topRanking.breakdown),
        weekStart: topRanking.weekStart,
        mixer: topRanking.mixer,
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get top mixer" }, 500);
  }
});

// GET /leaderboard - Get top 10 mixers for current week
rankingsRouter.get("/leaderboard", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const limit = parseInt(c.req.query("limit") || "10", 10);

    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const weekStart = getWeekStart();

    const rankings = await db.weeklyMixerRanking.findMany({
      where: {
        collegeId,
        weekStart,
      },
      orderBy: { rank: "asc" },
      take: limit,
      include: {
        mixer: {
          include: {
            groupA: { select: { id: true, name: true, coverImageUrl: true } },
            groupB: { select: { id: true, name: true, coverImageUrl: true } },
            activity: { select: { id: true, name: true, energyLevel: true } },
          },
        },
      },
    });

    return c.json({
      weekStart,
      leaderboard: rankings.map((r) => ({
        mixerId: r.mixerId,
        rank: r.rank,
        score: r.score,
        breakdown: JSON.parse(r.breakdown),
        mixer: r.mixer,
      })),
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get leaderboard" }, 500);
  }
});

// GET /groups-leaderboard - Top 5 groups ranked by (avgStarRating * mixerCount) over past 4 weeks
rankingsRouter.get("/groups-leaderboard", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // Find all completed mixers in the past 4 weeks for this college
    const recentMixers = await db.mixer.findMany({
      where: {
        collegeId,
        status: "completed",
        completedAt: { gte: fourWeeksAgo },
      },
      select: {
        id: true,
        groupAId: true,
        groupBId: true,
      },
    });

    // Count how many completed mixers each group participated in
    const mixerCountByGroup = new Map<string, number>();
    for (const mixer of recentMixers) {
      mixerCountByGroup.set(mixer.groupAId, (mixerCountByGroup.get(mixer.groupAId) ?? 0) + 1);
      mixerCountByGroup.set(mixer.groupBId, (mixerCountByGroup.get(mixer.groupBId) ?? 0) + 1);
    }

    if (mixerCountByGroup.size === 0) {
      return c.json({ leaderboard: [] });
    }

    // Fetch those groups with their avgStarRating
    const groupIds = Array.from(mixerCountByGroup.keys());
    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, collegeId },
      select: {
        id: true,
        name: true,
        coverImageUrl: true,
        category: true,
        avgStarRating: true,
        _count: { select: { members: true } },
      },
    });

    // Score = avgStarRating * mixerCount (if no rating yet, treat as 5.0 neutral)
    const scored = groups.map((g) => {
      const mixerCount = mixerCountByGroup.get(g.id) ?? 0;
      const rating = g.avgStarRating ?? 5.0;
      return {
        groupId: g.id,
        name: g.name,
        coverImageUrl: g.coverImageUrl,
        category: g.category,
        memberCount: g._count.members,
        avgStarRating: g.avgStarRating,
        mixerCount,
        score: parseFloat((rating * mixerCount).toFixed(2)),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5).map((g, i) => ({ ...g, rank: i + 1 }));

    return c.json({ leaderboard: top5 });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get groups leaderboard" }, 500);
  }
});

export { rankingsRouter };

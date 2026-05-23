import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import * as crypto from "crypto";

const heatmapRouter = new Hono();

// Minimum contributors required to show a venue vibe (privacy threshold)
const MIN_CONTRIBUTORS_THRESHOLD = 8;

// Helper: Get time bucket (truncate to hour)
function getTimeBucket(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

// Helper: Generate contributor hash
function generateContributorHash(
  userId: string,
  venueId: string,
  timeBucket: Date
): string {
  const input = `${userId}-${venueId}-${timeBucket.toISOString()}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Helper: Check if user is within posting window for any live mixer
async function isWithinAnyLivePostingWindow(userId: string): Promise<boolean> {
  const participations = await db.mixerParticipant.findMany({
    where: {
      userId,
      rsvpStatus: "going",
    },
    include: {
      mixer: true,
    },
  });

  const now = new Date();

  for (const p of participations) {
    if (p.mixer.status !== "live") continue;

    const scheduledStart = new Date(p.mixer.scheduledStart);
    const nextDay2AM = new Date(scheduledStart);
    nextDay2AM.setDate(nextDay2AM.getDate() + 1);
    nextDay2AM.setHours(2, 0, 0, 0);

    if (now >= scheduledStart && now <= nextDay2AM) {
      return true;
    }
  }

  return false;
}

// GET /venues - Get all venues for a college
heatmapRouter.get("/venues", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");

    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const venues = await db.campusVenue.findMany({
      where: { collegeId },
      orderBy: { name: "asc" },
    });

    return c.json({ venues });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get venues" }, 500);
  }
});

const createVenueSchema = z.object({
  collegeId: z.string(),
  name: z.string().min(1).max(100),
  category: z.enum(["dorm", "dining", "quad", "gym", "party", "other"]),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

// POST /venues - Create a new venue (admin or first-time setup)
heatmapRouter.post(
  "/venues",
  zValidator("json", createVenueSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const venue = await db.campusVenue.create({
        data,
      });

      return c.json({ venue }, 201);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        return c.json({ error: "Venue already exists" }, 409);
      }
      console.error(err);
      return c.json({ error: "Failed to create venue" }, 500);
    }
  }
);

const submitVibeSchema = z.object({
  userId: z.string(),
  venueId: z.string(),
  mixerId: z.string().optional(),
});

// POST /submit - Submit a vibe contribution
heatmapRouter.post(
  "/submit",
  zValidator("json", submitVibeSchema),
  async (c) => {
    try {
      const { userId, venueId } = c.req.valid("json");

      // Verify user is within a live posting window
      const canSubmit = await isWithinAnyLivePostingWindow(userId);
      if (!canSubmit) {
        return c.json({
          error: "You can only submit vibes while at a live mixer (until 2AM)",
        }, 403);
      }

      // Get venue to get collegeId
      const venue = await db.campusVenue.findUnique({
        where: { id: venueId },
      });

      if (!venue) {
        return c.json({ error: "Venue not found" }, 404);
      }

      // Verify user is from the same college
      const profile = await db.profile.findUnique({
        where: { id: userId },
      });

      if (!profile || profile.collegeId !== venue.collegeId) {
        return c.json({ error: "User not from this college" }, 403);
      }

      const timeBucket = getTimeBucket();
      const contributorHash = generateContributorHash(userId, venueId, timeBucket);

      // Try to create contribution (will fail if duplicate)
      try {
        await db.vibeContribution.create({
          data: {
            collegeId: venue.collegeId,
            venueId,
            timeBucket,
            contributorHash,
          },
        });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
          return c.json({ error: "Already contributed this hour", alreadyContributed: true }, 409);
        }
        throw err;
      }

      // Count unique contributors for this bucket
      const contributorCount = await db.vibeContribution.count({
        where: {
          venueId,
          timeBucket,
        },
      });

      // Upsert venue vibe
      await db.venueVibe.upsert({
        where: {
          collegeId_venueId_timeBucket: {
            collegeId: venue.collegeId,
            venueId,
            timeBucket,
          },
        },
        create: {
          collegeId: venue.collegeId,
          venueId,
          timeBucket,
          vibeScore: 1.0,
          uniqueContributors: contributorCount,
        },
        update: {
          vibeScore: { increment: 1.0 },
          uniqueContributors: contributorCount,
        },
      });

      return c.json({ success: true, contributorCount });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to submit vibe" }, 500);
    }
  }
);

// GET /heatmap - Get heatmap data (only venues with >= MIN_CONTRIBUTORS)
heatmapRouter.get("/heatmap", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const hours = parseInt(c.req.query("hours") || "6", 10);

    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Get all vibes for the time range with sufficient contributors
    const vibes = await db.venueVibe.findMany({
      where: {
        collegeId,
        timeBucket: { gte: cutoff },
        uniqueContributors: { gte: MIN_CONTRIBUTORS_THRESHOLD },
      },
      include: {
        venue: true,
      },
      orderBy: { vibeScore: "desc" },
    });

    // Aggregate by venue (sum vibes across time buckets)
    const venueVibeMap = new Map<
      string,
      {
        venue: typeof vibes[0]["venue"];
        totalScore: number;
        maxContributors: number;
        bucketCount: number;
      }
    >();

    for (const vibe of vibes) {
      const existing = venueVibeMap.get(vibe.venueId);
      if (existing) {
        existing.totalScore += vibe.vibeScore;
        existing.maxContributors = Math.max(existing.maxContributors, vibe.uniqueContributors);
        existing.bucketCount++;
      } else {
        venueVibeMap.set(vibe.venueId, {
          venue: vibe.venue,
          totalScore: vibe.vibeScore,
          maxContributors: vibe.uniqueContributors,
          bucketCount: 1,
        });
      }
    }

    // Convert to array and sort by total score
    const heatmapData = Array.from(venueVibeMap.values())
      .map((v) => ({
        venueId: v.venue.id,
        venueName: v.venue.name,
        category: v.venue.category,
        lat: v.venue.lat,
        lon: v.venue.lon,
        intensity: v.totalScore,
        maxContributors: v.maxContributors,
        bucketCount: v.bucketCount,
        // Normalized intensity (0-1 scale based on max)
        normalizedIntensity: 0, // Will be calculated below
      }))
      .sort((a, b) => b.intensity - a.intensity);

    // Calculate normalized intensity
    const maxIntensity = heatmapData[0]?.intensity || 1;
    for (const item of heatmapData) {
      item.normalizedIntensity = item.intensity / maxIntensity;
    }

    return c.json({
      heatmap: heatmapData,
      hours,
      lastUpdated: now.toISOString(),
      privacyThreshold: MIN_CONTRIBUTORS_THRESHOLD,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to get heatmap" }, 500);
  }
});

// GET /can-submit - Check if user can submit a vibe
heatmapRouter.get("/can-submit", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId query param required" }, 400);
    }

    const canSubmit = await isWithinAnyLivePostingWindow(userId);

    return c.json({ canSubmit });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to check submission status" }, 500);
  }
});

// POST /seed-venues - Seed default venues for a college (setup helper)
heatmapRouter.post("/seed-venues", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");

    if (!collegeId) {
      return c.json({ error: "collegeId query param required" }, 400);
    }

    const defaultVenues = [
      { name: "Main Quad", category: "quad" },
      { name: "Student Center", category: "other" },
      { name: "Library Lawn", category: "quad" },
      { name: "Dining Hall", category: "dining" },
      { name: "Gym", category: "gym" },
      { name: "North Dorms", category: "dorm" },
      { name: "South Dorms", category: "dorm" },
      { name: "East Dorms", category: "dorm" },
      { name: "West Dorms", category: "dorm" },
      { name: "Frat Row", category: "party" },
      { name: "Off-Campus House", category: "party" },
    ];

    const created = [];
    for (const venue of defaultVenues) {
      try {
        const v = await db.campusVenue.create({
          data: {
            collegeId,
            name: venue.name,
            category: venue.category,
          },
        });
        created.push(v);
      } catch {
        // Ignore duplicates
      }
    }

    return c.json({ created: created.length, venues: created });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to seed venues" }, 500);
  }
});

export { heatmapRouter };

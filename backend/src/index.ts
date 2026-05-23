import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { auth } from "./auth";
import { sampleRouter } from "./routes/sample";
import { logger } from "hono/logger";
import { collegesRouter } from "./routes/colleges";
import { profilesRouter } from "./routes/profiles";
import { interestsRouter } from "./routes/interests";
import { activitiesRouter } from "./routes/activities";
import { groupsRouter } from "./routes/groups";
import { mixerRequestsRouter } from "./routes/mixer-requests";
import { mixersRouter } from "./routes/mixers";
import { safetyRouter } from "./routes/safety";
import { storiesRouter } from "./routes/stories";
import { reactionsRouter } from "./routes/reactions";
import { rankingsRouter } from "./routes/rankings";
import { highlightsRouter } from "./routes/highlights";
import { heatmapRouter } from "./routes/heatmap";
import { ratingsRouter } from "./routes/ratings";
import { recapsRouter } from "./routes/recaps";
import { aiRouter } from "./routes/ai";
import eduVerificationRouter from "./routes/edu-verification";
import profileMediaRouter from "./routes/profile-media";
import { notificationsRouter } from "./routes/notifications";
import { invitesRouter } from "./routes/invites";
import { globalStoriesRouter } from "./routes/global-stories";
import { pairingRequestsRouter } from "./routes/pairing-requests";
import { chatRouter } from "./routes/chat";
import { openMixersRouter } from "./routes/open-mixers";
import { partiesRouter } from "./routes/parties";
import { directMessagesRouter } from "./routes/direct-messages";
import { db } from "./db";
import * as fs from "fs";
import * as path from "path";
import {
  apiRateLimit,
  strictRateLimit,
  securityHeaders,
  errorSanitizer,
  requestTimeout,
} from "./middleware/security";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Security headers - add protection headers to all responses
app.use("*", securityHeaders);

// Error sanitization - catch errors and return safe messages
app.use("*", errorSanitizer);

// Request timeout - 30 second timeout for all requests
app.use("*", requestTimeout({ timeoutMs: 30000 }));

// Global rate limiting - 100 requests per minute per IP
app.use("*", apiRateLimit);

// Logging
app.use("*", logger());

// Auth middleware - populates user/session for all routes
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth routes - stricter rate limiting for auth endpoints
app.use("/api/auth/*", strictRateLimit);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Stricter rate limiting for verification endpoint
app.use("/api/edu-verification/*", strictRateLimit);

// Current user endpoint
app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);
  return c.json({ user });
});

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/colleges", collegesRouter);
app.route("/api/profiles", profilesRouter);
app.route("/api/interests", interestsRouter);
app.route("/api/activities", activitiesRouter);
app.route("/api/groups", groupsRouter);
app.route("/api/mixer-requests", mixerRequestsRouter);
app.route("/api/mixers", mixersRouter);
app.route("/api/safety", safetyRouter);
app.route("/api/stories", storiesRouter);
app.route("/api/reactions", reactionsRouter);
app.route("/api/rankings", rankingsRouter);
app.route("/api/highlights", highlightsRouter);
app.route("/api/heatmap", heatmapRouter);
app.route("/api/ratings", ratingsRouter);
app.route("/api/recaps", recapsRouter);
app.route("/api/ai", aiRouter);
app.route("/api/edu-verification", eduVerificationRouter);
app.route("/api/profile-media", profileMediaRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/invites", invitesRouter);
app.route("/api/global-stories", globalStoriesRouter);
app.route("/api/pairing-requests", pairingRequestsRouter);
app.route("/api/chat", chatRouter);
app.route("/api/open-mixers", openMixersRouter);
app.route("/api/parties", partiesRouter);
app.route("/api/dm", directMessagesRouter);

// Generic file upload endpoint — stores to local uploads/generic/ and serves via /uploads/generic/:filename
app.post("/api/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  const uploadsDir = path.join(process.cwd(), "uploads", "generic");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${id}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  return c.json({
    data: {
      id,
      url: `${baseUrl}/uploads/generic/${filename}`,
      filename: file.name,
      contentType: file.type,
      sizeBytes: buffer.length,
    },
  });
});

// Serve generic uploads
app.get("/uploads/generic/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join(process.cwd(), "uploads", "generic", filename);
  if (!fs.existsSync(filePath)) return c.notFound();

  const file = fs.readFileSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "mp4" ? "video/mp4" :
    ext === "mov" ? "video/quicktime" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    "application/octet-stream";

  return new Response(file, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
  });
});

// Serve static files for global stories uploads
app.get("/uploads/global-stories/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join(process.cwd(), "uploads", "global-stories", filename);

  if (!fs.existsSync(filePath)) {
    return c.notFound();
  }

  const file = fs.readFileSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "mp4" ? "video/mp4" :
    ext === "mov" ? "video/quicktime" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    ext === "png" ? "image/png" :
    "image/jpeg";

  return new Response(file, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
});

// Serve static files for open mixer cover image uploads
app.get("/uploads/open-mixers/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join(process.cwd(), "uploads", "open-mixers", filename);

  if (!fs.existsSync(filePath)) {
    return c.notFound();
  }

  const file = fs.readFileSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    ext === "png" ? "image/png" :
    "image/jpeg";

  return new Response(file, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
  });
});

const port = Number(process.env.PORT) || 3000;

// Automatic story cleanup - runs every hour
async function cleanupExpiredStories() {
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

    // Delete storage files for stories older than 48 hours
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

    // Remove records for stories with deleted files
    if (oldStories.length > 0) {
      await db.mixerStory.deleteMany({
        where: {
          id: { in: oldStories.map((s) => s.id) },
        },
      });
    }

    if (result.count > 0 || filesDeleted > 0) {
      console.log(`[Cleanup] Expired ${result.count} stories, deleted ${filesDeleted} files`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to cleanup stories:", err);
  }
}

// Run cleanup on startup and every hour
cleanupExpiredStories();
setInterval(cleanupExpiredStories, 60 * 60 * 1000);

// Auto-complete mixers whose scheduledEnd has passed
async function autoCompleteMixers() {
  try {
    const now = new Date();

    // Find live mixers with a scheduledEnd that has passed
    const expiredLiveMixers = await db.mixer.findMany({
      where: {
        status: "live",
        scheduledEnd: { lt: now, not: null },
      },
      select: { id: true, scheduledEnd: true },
    });

    for (const mixer of expiredLiveMixers) {
      await db.mixer.update({
        where: { id: mixer.id },
        data: {
          status: "completed",
          completedAt: now,
          recapExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(`[AutoComplete] Completed mixer ${mixer.id} (scheduledEnd: ${mixer.scheduledEnd})`);
    }

    // Also complete upcoming/locked mixers whose end time has already passed
    const expiredUpcomingMixers = await db.mixer.findMany({
      where: {
        status: { in: ["upcoming", "locked"] },
        scheduledEnd: { lt: now, not: null },
      },
      select: { id: true, scheduledEnd: true },
    });

    for (const mixer of expiredUpcomingMixers) {
      await db.mixer.update({
        where: { id: mixer.id },
        data: {
          status: "completed",
          completedAt: now,
          pairingLocked: true,
          recapExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(`[AutoComplete] Completed upcoming mixer ${mixer.id} (scheduledEnd: ${mixer.scheduledEnd})`);
    }

    // Auto-complete live open mixers whose scheduledEnd has passed
    const expiredOpenMixers = await db.openMixer.findMany({
      where: {
        status: "live",
        scheduledEnd: { lt: now, not: null },
      },
      select: { id: true, scheduledEnd: true },
    });

    for (const mixer of expiredOpenMixers) {
      await db.openMixer.update({
        where: { id: mixer.id },
        data: {
          status: "completed",
          completedAt: now,
        },
      });
      console.log(`[AutoComplete] Completed open mixer ${mixer.id} (scheduledEnd: ${mixer.scheduledEnd})`);
    }

    // Also complete open/full open mixers whose end time has passed
    const expiredOpenStatusMixers = await db.openMixer.findMany({
      where: {
        status: { in: ["open", "full"] },
        scheduledEnd: { lt: now, not: null },
      },
      select: { id: true, scheduledEnd: true },
    });

    for (const mixer of expiredOpenStatusMixers) {
      await db.openMixer.update({
        where: { id: mixer.id },
        data: {
          status: "completed",
          completedAt: now,
          pairingLocked: true,
        },
      });
      console.log(`[AutoComplete] Completed open mixer ${mixer.id} (scheduledEnd: ${mixer.scheduledEnd})`);
    }

    const total = expiredLiveMixers.length + expiredUpcomingMixers.length + expiredOpenMixers.length + expiredOpenStatusMixers.length;

    // Stale live mixers: no scheduledEnd set, but scheduledStart was > 8 hours ago
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const staleLiveMixers = await db.mixer.findMany({
      where: {
        status: "live",
        scheduledEnd: null,
        scheduledStart: { lt: eightHoursAgo },
      },
      select: { id: true, scheduledStart: true },
    });

    for (const mixer of staleLiveMixers) {
      await db.mixer.update({
        where: { id: mixer.id },
        data: {
          status: "completed",
          completedAt: now,
          recapExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(`[AutoComplete] Completed stale live mixer ${mixer.id} (scheduledStart: ${mixer.scheduledStart})`);
    }

    if (total + staleLiveMixers.length > 0) {
      console.log(`[AutoComplete] Auto-completed ${total + staleLiveMixers.length} mixer(s) total`);
    }
  } catch (err) {
    console.error("[AutoComplete] Failed to auto-complete mixers:", err);
  }
}

// Run auto-complete check every 5 minutes
autoCompleteMixers();
setInterval(autoCompleteMixers, 5 * 60 * 1000);

// Auto-start mixers whose scheduledStart has passed but are still upcoming/locked
async function autoStartMixers() {
  try {
    const now = new Date();

    const pendingMixers = await db.mixer.findMany({
      where: {
        status: { in: ["upcoming", "locked"] },
        scheduledStart: { lt: now },
      },
      select: {
        id: true,
        scheduledStart: true,
        status: true,
        groupAId: true,
        groupBId: true,
      },
    });

    for (const mixer of pendingMixers) {
      // Auto-RSVP all members of both groups as "going" if not already a participant
      const [groupAMembers, groupBMembers] = await Promise.all([
        db.groupMember.findMany({ where: { groupId: mixer.groupAId }, select: { userId: true } }),
        db.groupMember.findMany({ where: { groupId: mixer.groupBId }, select: { userId: true } }),
      ]);

      for (const m of groupAMembers) {
        await db.mixerParticipant.upsert({
          where: { mixerId_userId_groupId: { mixerId: mixer.id, userId: m.userId, groupId: mixer.groupAId } },
          create: { mixerId: mixer.id, userId: m.userId, groupId: mixer.groupAId, rsvpStatus: "going" },
          update: {},
        });
      }
      for (const m of groupBMembers) {
        await db.mixerParticipant.upsert({
          where: { mixerId_userId_groupId: { mixerId: mixer.id, userId: m.userId, groupId: mixer.groupBId } },
          create: { mixerId: mixer.id, userId: m.userId, groupId: mixer.groupBId, rsvpStatus: "going" },
          update: {},
        });
      }

      // Reveal all pairings
      await db.pairing.updateMany({
        where: { mixerId: mixer.id },
        data: { revealed: true },
      });

      await db.mixer.update({
        where: { id: mixer.id },
        data: {
          status: "live",
          liveStartedAt: now,
          pairingLocked: true,
        },
      });
      console.log(`[AutoStart] Started mixer ${mixer.id} — auto-RSVP'd ${groupAMembers.length + groupBMembers.length} members`);
    }

    if (pendingMixers.length > 0) {
      console.log(`[AutoStart] Auto-started ${pendingMixers.length} mixer(s)`);
    }
  } catch (err) {
    console.error("[AutoStart] Failed to auto-start mixers:", err);
  }
}

// Run auto-start check every 5 minutes
autoStartMixers();
setInterval(autoStartMixers, 5 * 60 * 1000);

// Compute rankings daily at 3:00 AM PST (UTC-8 standard, UTC-7 daylight)
// 3:00 AM PST = 11:00 AM UTC (standard) / 10:00 AM UTC (daylight)
// We target 11:00 AM UTC to handle PST (non-daylight)
async function computeDailyRankings() {
  try {
    console.log("[Rankings] Running daily rankings computation...");
    const colleges = await db.college.findMany();
    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const college of colleges) {
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

      const scoredMixers: { mixerId: string; score: number; breakdown: object }[] = [];

      for (const mixer of mixers) {
        const storyPosts = await db.mixerStory.count({ where: { mixerId: mixer.id, isDeleted: false } });
        const stories = await db.mixerStory.findMany({ where: { mixerId: mixer.id, isDeleted: false }, select: { id: true } });
        const storyIds = stories.map((s) => s.id);
        const totalReactions = await db.storyReaction.count({ where: { storyId: { in: storyIds } } });
        const uniqueReactorsResult = await db.storyReaction.groupBy({ by: ["reactorId"], where: { storyId: { in: storyIds } } });
        const uniqueReactors = uniqueReactorsResult.length;
        const feedbacks = await db.mixerFeedback.findMany({ where: { mixerId: mixer.id }, select: { conversationRating: true, wouldMixAgain: true } });

        let avgConversationRating = 0;
        let wouldMixAgainRate = 0;
        if (feedbacks.length > 0) {
          const conversationRatings = feedbacks.map((f) => f.conversationRating).filter((r): r is number => r !== null);
          if (conversationRatings.length > 0) {
            avgConversationRating = conversationRatings.reduce((a, b) => a + b, 0) / conversationRatings.length;
          }
          const wouldMixAgainResponses = feedbacks.map((f) => f.wouldMixAgain).filter((r): r is boolean => r !== null);
          if (wouldMixAgainResponses.length > 0) {
            wouldMixAgainRate = wouldMixAgainResponses.filter((r) => r).length / wouldMixAgainResponses.length;
          }
        }

        const rawScore = storyPosts * 2 + totalReactions * 1.5 + uniqueReactors * 2 + avgConversationRating * 3 + wouldMixAgainRate * 4;
        scoredMixers.push({ mixerId: mixer.id, score: rawScore, breakdown: { storyPosts, totalReactions, uniqueReactors, avgConversationRating, wouldMixAgainRate, rawScore } });
      }

      scoredMixers.sort((a, b) => b.score - a.score);

      for (let i = 0; i < scoredMixers.length; i++) {
        const sm = scoredMixers[i];
        if (!sm) continue;
        await db.weeklyMixerRanking.upsert({
          where: { collegeId_weekStart_mixerId: { collegeId: college.id, weekStart, mixerId: sm.mixerId } },
          create: { collegeId: college.id, weekStart, mixerId: sm.mixerId, score: sm.score, breakdown: JSON.stringify(sm.breakdown), rank: i + 1 },
          update: { score: sm.score, breakdown: JSON.stringify(sm.breakdown), rank: i + 1 },
        });
      }
    }

    console.log(`[Rankings] Daily rankings computed for ${colleges.length} college(s)`);
  } catch (err) {
    console.error("[Rankings] Failed to compute daily rankings:", err);
  }
}

// Schedule daily rankings at 3:00 AM PST = 11:00 AM UTC
function scheduleDailyRankings() {
  const now = new Date();
  // Target: next 11:00 AM UTC
  const next = new Date(now);
  next.setUTCHours(11, 0, 0, 0);
  if (next <= now) {
    // Already past today's 11:00 AM UTC, schedule for tomorrow
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const msUntilNext = next.getTime() - now.getTime();
  console.log(`[Rankings] Next daily computation scheduled in ${Math.round(msUntilNext / 1000 / 60)} minutes`);
  setTimeout(() => {
    computeDailyRankings();
    // After first run, repeat every 24 hours
    setInterval(computeDailyRankings, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

scheduleDailyRankings();

export default {
  port,
  fetch: app.fetch,
};

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const activitiesRouter = new Hono();

// GET / — list all activities (optional ?category= filter)
activitiesRouter.get("/", async (c) => {
  try {
    const category = c.req.query("category");
    const activities = await db.activity.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: "asc" },
    });
    return c.json({ activities });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch activities" }, 500);
  }
});

// GET /trending — top activities by usage across mixers + open mixers in the
// last 4 weeks. Falls back to most-popular all-time, then to any 3 activities.
activitiesRouter.get("/trending", async (c) => {
  try {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const [mixerCounts, openCounts] = await Promise.all([
      db.mixer.groupBy({
        by: ["activityId"],
        where: { activityId: { not: null }, scheduledStart: { gte: fourWeeksAgo } },
        _count: { activityId: true },
      }),
      db.openMixer.groupBy({
        by: ["activityId"],
        where: { activityId: { not: null }, scheduledStart: { gte: fourWeeksAgo } },
        _count: { activityId: true },
      }),
    ]);
    const tally = new Map<string, number>();
    for (const row of mixerCounts) {
      if (!row.activityId) continue;
      tally.set(row.activityId, (tally.get(row.activityId) ?? 0) + row._count.activityId);
    }
    for (const row of openCounts) {
      if (!row.activityId) continue;
      tally.set(row.activityId, (tally.get(row.activityId) ?? 0) + row._count.activityId);
    }
    const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let activities = sorted.length > 0
      ? await db.activity.findMany({ where: { id: { in: sorted.map(([id]) => id) } } })
      : [];
    if (activities.length < 3) {
      // Fill with random other activities so the section always renders.
      const have = new Set(activities.map((a) => a.id));
      const fillers = await db.activity.findMany({ take: 3 - activities.length, where: { id: { notIn: Array.from(have) } } });
      activities = [...activities, ...fillers];
    }
    // Preserve trending order
    const orderMap = new Map(sorted.map(([id], idx) => [id, idx]));
    activities.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    return c.json({ activities });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch trending activities" }, 500);
  }
});

// GET /:id — get activity by id
activitiesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const activity = await db.activity.findUnique({ where: { id } });
    if (!activity) return c.json({ error: "Activity not found" }, 404);
    return c.json({ activity });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch activity" }, 500);
  }
});

export { activitiesRouter };

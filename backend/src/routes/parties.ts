import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const partiesRouter = new Hono();

// ── Weekend date range helper ─────────────────────────────────────────────────

/**
 * Returns the Saturday 00:00:00 and Sunday 23:59:59.999 of the current week.
 * Week anchor: Saturday is day 6, Sunday is day 0 (JS getDay()).
 * We define "this weekend" as the Saturday and Sunday that are closest
 * to today — if today is already Sat or Sun we use today's week.
 */
function getCurrentWeekendRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Days until Saturday from today (wraps forward)
  // If today is Sun (0): next Sat is 6 days away
  // If today is Sat (6): 0 days away
  const daysUntilSat = day === 6 ? 0 : (6 - day);

  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSat);
  saturday.setHours(0, 0, 0, 0);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);

  return { start: saturday, end: sunday };
}

// ── GET / — list parties ───────────────────────────────────────────────────────

partiesRouter.get("/", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const weekendOnly = c.req.query("weekendOnly") === "true";

    const where: {
      collegeId?: string;
      date?: { gte: Date; lte: Date };
    } = {};

    if (collegeId) {
      where.collegeId = collegeId;
    }

    if (weekendOnly) {
      const { start, end } = getCurrentWeekendRange();
      where.date = { gte: start, lte: end };
    }

    const parties = await db.party.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return c.json({ parties });
  } catch (err) {
    console.error("[parties GET /]", err);
    return c.json({ error: "Failed to fetch parties" }, 500);
  }
});

// ── POST / — create a party ───────────────────────────────────────────────────

const createPartySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  location: z.string().min(1).max(300),
  date: z.string().datetime(),
  imageUrl: z.string().url().optional(),
  hostName: z.string().max(200).optional(),
  collegeId: z.string().optional(),
});

partiesRouter.post("/", zValidator("json", createPartySchema), async (c) => {
  try {
    const data = c.req.valid("json");

    const party = await db.party.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        date: new Date(data.date),
        imageUrl: data.imageUrl,
        hostName: data.hostName,
        collegeId: data.collegeId,
      },
    });

    return c.json({ party }, 201);
  } catch (err) {
    console.error("[parties POST /]", err);
    return c.json({ error: "Failed to create party" }, 500);
  }
});

// ── DELETE /:id — delete a party ──────────────────────────────────────────────

partiesRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existing = await db.party.findUnique({ where: { id } });
    if (!existing) return c.json({ error: "Party not found" }, 404);

    await db.party.delete({ where: { id } });

    return c.json({ success: true });
  } catch (err) {
    console.error("[parties DELETE /:id]", err);
    return c.json({ error: "Failed to delete party" }, 500);
  }
});

export { partiesRouter };

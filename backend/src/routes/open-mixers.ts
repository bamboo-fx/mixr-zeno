import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import * as fs from "fs";
import * as path from "path";

const openMixersRouter = new Hono();

// ── Reusable includes ─────────────────────────────────────────────────────────

const hostSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  collegeId: true,
  yearInSchool: true,
} as const;

const participantInclude = {
  user: { select: hostSelect },
} as const;

// ── GET / — list upcoming open mixers ────────────────────────────────────────
openMixersRouter.get("/", async (c) => {
  try {
    const statusParam = c.req.query("status");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "20", 10), 50);
    const userId = c.req.query("userId"); // optional: check isParticipant on list

    const statusFilter = statusParam
      ? { status: statusParam }
      : { status: { in: ["open", "full", "live"] } };

    const openMixers = await db.openMixer.findMany({
      where: {
        ...statusFilter,
        scheduledStart: { gte: new Date() },
      },
      include: {
        host: { select: hostSelect },
        activity: true,
        _count: { select: { participants: true } },
      },
      orderBy: { scheduledStart: "asc" },
      take: limit,
    });

    // If userId provided, check participation status for each
    let participatingIds = new Set<string>();
    if (userId) {
      const myParticipations = await db.openMixerParticipant.findMany({
        where: { userId, openMixerId: { in: openMixers.map((m) => m.id) } },
        select: { openMixerId: true },
      });
      participatingIds = new Set(myParticipations.map((p) => p.openMixerId));
    }

    return c.json({
      openMixers: openMixers.map((m) => ({
        ...m,
        isParticipant: participatingIds.has(m.id),
      })),
    });
  } catch (err) {
    console.error("[open-mixers GET /]", err);
    return c.json({ error: "Failed to fetch open mixers" }, 500);
  }
});

// ── POST / — create open mixer ────────────────────────────────────────────────
const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  color: z.string().optional(),
  backgroundImage: z.string().optional(),
  activityId: z.string().optional(),
  hostId: z.string(),
  location: z.string().min(2).max(200),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().optional(),
  maxCapacity: z.number().int().min(2).max(200).default(20),
});

openMixersRouter.post("/", zValidator("json", createSchema), async (c) => {
  try {
    const data = c.req.valid("json");

    const host = await db.profile.findUnique({ where: { id: data.hostId } });
    if (!host) return c.json({ error: "Host profile not found" }, 404);

    const openMixer = await db.$transaction(async (tx) => {
      const mixer = await tx.openMixer.create({
        data: {
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          color: data.color,
          backgroundImage: data.backgroundImage,
          activityId: data.activityId,
          hostId: data.hostId,
          location: data.location,
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
          maxCapacity: data.maxCapacity,
          status: "open",
        },
        include: {
          host: { select: hostSelect },
          activity: true,
          _count: { select: { participants: true } },
        },
      });
      // Auto-join host as first participant
      await tx.openMixerParticipant.create({
        data: { openMixerId: mixer.id, userId: data.hostId, rsvpStatus: "going" },
      });
      return mixer;
    });

    return c.json({ openMixer: { ...openMixer, isParticipant: true } }, 201);
  } catch (err) {
    console.error("[open-mixers POST /]", err);
    return c.json({ error: "Failed to create open mixer" }, 500);
  }
});

// ── GET /:id — full detail ────────────────────────────────────────────────────
openMixersRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const viewerId = c.req.query("viewerId");

    const openMixer = await db.openMixer.findUnique({
      where: { id },
      include: {
        host: { select: hostSelect },
        activity: true,
        participants: {
          include: participantInclude,
          orderBy: { createdAt: "asc" },
        },
        pairings: true,
      },
    });

    if (!openMixer) return c.json({ error: "Open mixer not found" }, 404);

    // Enrich pairings with user profiles
    const allUserIds = new Set<string>();
    for (const p of openMixer.pairings) {
      allUserIds.add(p.userAId);
      allUserIds.add(p.userBId);
    }
    const profiles =
      allUserIds.size > 0
        ? await db.profile.findMany({
            where: { id: { in: Array.from(allUserIds) } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const enrichedPairings = openMixer.pairings.map((p) => ({
      ...p,
      userA: profileMap[p.userAId] ?? null,
      userB: profileMap[p.userBId] ?? null,
    }));

    const isParticipant = viewerId
      ? openMixer.participants.some((p) => p.userId === viewerId)
      : false;

    const participantCount = openMixer.participants.length;

    return c.json({
      openMixer: {
        ...openMixer,
        pairings: enrichedPairings,
        isParticipant,
        _count: { participants: participantCount },
      },
    });
  } catch (err) {
    console.error("[open-mixers GET /:id]", err);
    return c.json({ error: "Failed to fetch open mixer" }, 500);
  }
});

// ── POST /:id/join ────────────────────────────────────────────────────────────
const joinSchema = z.object({ userId: z.string() });

openMixersRouter.post("/:id/join", zValidator("json", joinSchema), async (c) => {
  try {
    const openMixerId = c.req.param("id");
    const { userId } = c.req.valid("json");

    const openMixer = await db.openMixer.findUnique({
      where: { id: openMixerId },
      include: { _count: { select: { participants: true } } },
    });

    if (!openMixer) return c.json({ error: "Open mixer not found" }, 404);
    if (openMixer.status === "cancelled")
      return c.json({ error: "This mixer has been cancelled" }, 400);
    if (openMixer.status === "live" || openMixer.status === "completed")
      return c.json({ error: "This mixer has already started" }, 400);
    if (openMixer._count.participants >= openMixer.maxCapacity)
      return c.json({ error: "This mixer is at full capacity" }, 400);

    const existing = await db.openMixerParticipant.findUnique({
      where: { openMixerId_userId: { openMixerId, userId } },
    });
    if (existing) return c.json({ error: "Already joined this mixer" }, 409);

    const participant = await db.$transaction(async (tx) => {
      const p = await tx.openMixerParticipant.create({
        data: { openMixerId, userId, rsvpStatus: "going" },
        include: participantInclude,
      });
      const newCount = openMixer._count.participants + 1;
      if (newCount >= openMixer.maxCapacity) {
        await tx.openMixer.update({
          where: { id: openMixerId },
          data: { status: "full" },
        });
      }
      return p;
    });

    return c.json({ participant }, 201);
  } catch (err) {
    console.error("[open-mixers POST /:id/join]", err);
    return c.json({ error: "Failed to join open mixer" }, 500);
  }
});

// ── DELETE /:id/leave ─────────────────────────────────────────────────────────
const leaveSchema = z.object({ userId: z.string() });

openMixersRouter.delete("/:id/leave", zValidator("json", leaveSchema), async (c) => {
  try {
    const openMixerId = c.req.param("id");
    const { userId } = c.req.valid("json");

    const openMixer = await db.openMixer.findUnique({ where: { id: openMixerId } });
    if (!openMixer) return c.json({ error: "Open mixer not found" }, 404);
    if (openMixer.hostId === userId)
      return c.json({ error: "Host cannot leave — cancel the mixer instead" }, 400);
    if (openMixer.status === "live")
      return c.json({ error: "Cannot leave a live mixer" }, 400);

    await db.$transaction(async (tx) => {
      await tx.openMixerParticipant.delete({
        where: { openMixerId_userId: { openMixerId, userId } },
      });
      if (openMixer.status === "full") {
        await tx.openMixer.update({
          where: { id: openMixerId },
          data: { status: "open" },
        });
      }
    });

    return c.json({ success: true });
  } catch (err) {
    console.error("[open-mixers DELETE /:id/leave]", err);
    return c.json({ error: "Failed to leave open mixer" }, 500);
  }
});

// ── PUT /:id — edit open mixer details (host only) ───────────────────────────
openMixersRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      hostId: string;
      title?: string;
      description?: string;
      location?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
      maxCapacity?: number;
      imageUrl?: string;
      color?: string;
      backgroundImage?: string;
    }>();

    const mixer = await db.openMixer.findUnique({ where: { id } });
    if (!mixer) return c.json({ error: "Not found" }, 404);
    if (mixer.hostId !== body.hostId) return c.json({ error: "Forbidden" }, 403);

    const updated = await db.openMixer.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.location ? { location: body.location } : {}),
        ...(body.scheduledStart ? { scheduledStart: new Date(body.scheduledStart) } : {}),
        ...(body.scheduledEnd !== undefined ? { scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null } : {}),
        ...(body.maxCapacity ? { maxCapacity: body.maxCapacity } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.backgroundImage !== undefined ? { backgroundImage: body.backgroundImage } : {}),
      },
      include: {
        host: { select: hostSelect },
        activity: true,
        participants: { include: participantInclude },
        _count: { select: { participants: true } },
      },
    });

    return c.json({ openMixer: updated });
  } catch (err) {
    console.error("[open-mixers PUT /:id]", err);
    return c.json({ error: "Failed to update open mixer" }, 500);
  }
});

// ── PUT /:id/status ───────────────────────────────────────────────────────────
const TRANSITIONS: Record<string, string[]> = {
  open:      ["full", "live", "cancelled"],
  full:      ["open", "live", "cancelled"],
  live:      ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const updateStatusSchema = z.object({
  status: z.enum(["open", "full", "live", "completed", "cancelled"]),
  hostId: z.string(),
});

openMixersRouter.put("/:id/status", zValidator("json", updateStatusSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const { status, hostId } = c.req.valid("json");

    const existing = await db.openMixer.findUnique({ where: { id } });
    if (!existing) return c.json({ error: "Open mixer not found" }, 404);
    if (existing.hostId !== hostId)
      return c.json({ error: "Only the host can update mixer status" }, 403);

    const allowed = TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      return c.json({
        error: `Cannot transition from '${existing.status}' to '${status}'`,
      }, 400);
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "live") {
      updateData.liveStartedAt = new Date();
      updateData.pairingLocked = true;
      await db.openMixerPairing.updateMany({
        where: { openMixerId: id },
        data: { revealed: true },
      });
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const openMixer = await db.openMixer.update({
      where: { id },
      data: updateData,
      include: {
        host: { select: hostSelect },
        activity: true,
        _count: { select: { participants: true } },
      },
    });

    return c.json({ openMixer });
  } catch (err) {
    console.error("[open-mixers PUT /:id/status]", err);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// ── POST /:id/generate-pairings ───────────────────────────────────────────────
const generatePairingsSchema = z.object({ hostId: z.string() });

openMixersRouter.post(
  "/:id/generate-pairings",
  zValidator("json", generatePairingsSchema),
  async (c) => {
    try {
      const openMixerId = c.req.param("id");
      const { hostId } = c.req.valid("json");

      const openMixer = await db.openMixer.findUnique({
        where: { id: openMixerId },
        include: { participants: { include: { user: true } } },
      });

      if (!openMixer) return c.json({ error: "Open mixer not found" }, 404);
      if (openMixer.hostId !== hostId)
        return c.json({ error: "Only the host can generate pairings" }, 403);

      const participants = openMixer.participants.map((p) => p.user);
      if (participants.length < 2)
        return c.json({ error: "Need at least 2 participants to generate pairings" }, 400);

      // Fisher-Yates shuffle then pair sequentially
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const pairingData: { userAId: string; userBId: string }[] = [];
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        const a = shuffled[i];
        const b = shuffled[i + 1];
        if (a && b) pairingData.push({ userAId: a.id, userBId: b.id });
      }

      const pairings = await db.$transaction(async (tx) => {
        await tx.openMixerPairing.deleteMany({ where: { openMixerId } });
        return Promise.all(
          pairingData.map((p) =>
            tx.openMixerPairing.create({
              data: { openMixerId, userAId: p.userAId, userBId: p.userBId },
            })
          )
        );
      });

      return c.json({ pairings, count: pairings.length });
    } catch (err) {
      console.error("[open-mixers POST /:id/generate-pairings]", err);
      return c.json({ error: "Failed to generate pairings" }, 500);
    }
  }
);

// POST /api/open-mixers/:id/upload-image — upload cover image for open mixer (host only)
openMixersRouter.post("/:id/upload-image", async (c) => {
  const id = c.req.param("id");

  const mixer = await db.openMixer.findUnique({ where: { id } });
  if (!mixer) return c.json({ error: "Not found" }, 404);

  const formData = await c.req.formData();
  const hostId = formData.get("hostId") as string;
  const file = formData.get("file") as File | null;

  if (!hostId || mixer.hostId !== hostId) return c.json({ error: "Forbidden" }, 403);
  if (!file) return c.json({ error: "No file provided" }, 400);

  // Save to uploads/open-mixers/ directory (create if needed)
  const uploadsDir = path.join(process.cwd(), "uploads", "open-mixers");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${id}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  const buffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  // Build public URL using the backend base URL from env
  const baseUrl = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const imageUrl = `${baseUrl}/uploads/open-mixers/${filename}`;

  // Update the mixer
  await db.openMixer.update({
    where: { id },
    data: { imageUrl },
  });

  return c.json({ imageUrl });
});

export { openMixersRouter };

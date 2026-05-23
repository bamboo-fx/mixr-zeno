import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import { runSmartPairing } from "../lib/pairing-scorer.js";

const mixersRouter = new Hono();

// GET / — list mixers (?groupId= or ?collegeId=)
mixersRouter.get("/", async (c) => {
  try {
    const groupId = c.req.query("groupId");
    const collegeId = c.req.query("collegeId");

    if (!groupId && !collegeId) {
      return c.json({ error: "groupId or collegeId query param is required" }, 400);
    }

    const mixers = await db.mixer.findMany({
      where: {
        ...(groupId
          ? { OR: [{ groupAId: groupId }, { groupBId: groupId }] }
          : {}),
        ...(collegeId ? { collegeId } : {}),
      },
      include: {
        groupA: true,
        groupB: true,
        activity: true,
        college: true,
      },
      orderBy: { scheduledStart: "asc" },
    });
    return c.json({ mixers });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch mixers" }, 500);
  }
});

// GET /:id — get mixer by id
mixersRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId");
    const mixer = await db.mixer.findUnique({
      where: { id },
      include: {
        groupA: { include: { members: true } },
        groupB: { include: { members: true } },
        activity: true,
        college: true,
        participants: {
          include: { user: { include: { interests: { include: { interest: true } } } } },
        },
        pairings: true,
      },
    });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);

    // Enrich pairings with full user profiles (including interests)
    const allUserIds = new Set<string>();
    for (const p of mixer.pairings) {
      allUserIds.add(p.userAId);
      allUserIds.add(p.userBId);
    }
    const profiles = allUserIds.size > 0
      ? await db.profile.findMany({
          where: { id: { in: Array.from(allUserIds) } },
          include: { interests: { include: { interest: true } } },
        })
      : [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const enrichedPairings = mixer.pairings.map((p) => ({
      ...p,
      userA: profileMap[p.userAId] ?? null,
      userB: profileMap[p.userBId] ?? null,
    }));

    // Fetch this user's existing rating if userId provided
    let myRating: number | null = null;
    if (userId) {
      const existingRating = await db.mixerRating.findFirst({
        where: { mixerId: id, raterId: userId },
        select: { rating: true },
      });
      myRating = existingRating?.rating ?? null;
    }

    return c.json({ mixer: { ...mixer, pairings: enrichedPairings, myRating } });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch mixer" }, 500);
  }
});

const updateStatusSchema = z.object({
  status: z.enum(["upcoming", "locked", "live", "completed", "cancelled"]),
  requesterId: z.string(), // Who is updating status
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["locked", "live", "cancelled"],
  locked: ["live", "cancelled", "upcoming"], // allow unlock
  live: ["completed", "cancelled"],
  completed: [], // terminal state
  cancelled: [], // terminal state
};

// PUT /:id/status — update mixer status (with validation)
mixersRouter.put(
  "/:id/status",
  zValidator("json", updateStatusSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { status, requesterId } = c.req.valid("json");

      const existing = await db.mixer.findUnique({ where: { id } });
      if (!existing) return c.json({ error: "Mixer not found" }, 404);

      // Authorization: check if requester is admin/social_chair of either group
      const membershipA = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: existing.groupAId, userId: requesterId } },
      });
      const membershipB = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: existing.groupBId, userId: requesterId } },
      });
      const isAdmin =
        membershipA?.role === "social_chair" || membershipA?.role === "admin" ||
        membershipB?.role === "social_chair" || membershipB?.role === "admin";

      if (!isAdmin) {
        return c.json({ error: "Only group admins can update mixer status" }, 403);
      }

      // Validate status transition
      const allowedNext = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowedNext.includes(status)) {
        return c.json({
          error: `Cannot transition from '${existing.status}' to '${status}'. Allowed: ${allowedNext.join(", ") || "none"}`,
        }, 400);
      }

      const data: {
        status: string;
        liveStartedAt?: Date;
        completedAt?: Date;
        pairingLocked?: boolean;
        recapExpiresAt?: Date;
      } = { status };

      if (status === "live") {
        data.liveStartedAt = new Date();
        data.pairingLocked = true;
        // Reveal all pairings
        await db.pairing.updateMany({
          where: { mixerId: id },
          data: { revealed: true },
        });
        // Auto-RSVP all members of both groups as "going"
        const [groupAMembers, groupBMembers] = await Promise.all([
          db.groupMember.findMany({ where: { groupId: existing.groupAId }, select: { userId: true } }),
          db.groupMember.findMany({ where: { groupId: existing.groupBId }, select: { userId: true } }),
        ]);
        for (const m of groupAMembers) {
          await db.mixerParticipant.upsert({
            where: { mixerId_userId_groupId: { mixerId: id, userId: m.userId, groupId: existing.groupAId } },
            create: { mixerId: id, userId: m.userId, groupId: existing.groupAId, rsvpStatus: "going" },
            update: {},
          });
        }
        for (const m of groupBMembers) {
          await db.mixerParticipant.upsert({
            where: { mixerId_userId_groupId: { mixerId: id, userId: m.userId, groupId: existing.groupBId } },
            create: { mixerId: id, userId: m.userId, groupId: existing.groupBId, rsvpStatus: "going" },
            update: {},
          });
        }
      } else if (status === "completed") {
        data.completedAt = new Date();
        // Set recap expiry to 24 hours from now
        data.recapExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      const mixer = await db.mixer.update({
        where: { id },
        data,
        include: { groupA: true, groupB: true, activity: true },
      });
      return c.json({ mixer });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update mixer status" }, 500);
    }
  },
);

const setPairingModeSchema = z.object({
  mode: z.enum(["manual", "random", "smart"]),
});

// PUT /:id/pairing-mode — set pairing mode
mixersRouter.put(
  "/:id/pairing-mode",
  zValidator("json", setPairingModeSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { mode } = c.req.valid("json");
      const mixer = await db.mixer.update({
        where: { id },
        data: { pairingMode: mode },
      });
      return c.json({ mixer });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update pairing mode" }, 500);
    }
  },
);

const addParticipantSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  rsvpStatus: z.string().optional(),
});

// POST /:id/participants — add participant
mixersRouter.post(
  "/:id/participants",
  zValidator("json", addParticipantSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { userId, groupId, rsvpStatus } = c.req.valid("json");
      const participant = await db.mixerParticipant.upsert({
        where: { mixerId_userId_groupId: { mixerId, userId, groupId } },
        create: { mixerId, userId, groupId, rsvpStatus: rsvpStatus ?? "going" },
        update: { rsvpStatus: rsvpStatus ?? "going" },
        include: { user: true },
      });
      return c.json({ participant }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to add participant" }, 500);
    }
  },
);

const updateRsvpSchema = z.object({ rsvpStatus: z.string() });

// PUT /:id/participants/:userId/rsvp — update RSVP
mixersRouter.put(
  "/:id/participants/:userId/rsvp",
  zValidator("json", updateRsvpSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const userId = c.req.param("userId");
      const { rsvpStatus } = c.req.valid("json");
      await db.mixerParticipant.updateMany({
        where: { mixerId, userId },
        data: { rsvpStatus },
      });
      return c.json({ ok: true });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update RSVP" }, 500);
    }
  },
);

// PUT /:id/participants/:userId/checkin — check in participant
mixersRouter.put("/:id/participants/:userId/checkin", async (c) => {
  try {
    const mixerId = c.req.param("id");
    const userId = c.req.param("userId");
    const participant = await db.mixerParticipant.updateMany({
      where: { mixerId, userId },
      data: { checkedIn: true },
    });
    return c.json({ participant });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to check in participant" }, 500);
  }
});

const generatePairingsSchema = z.object({
  mode: z.enum(["random", "smart"]),
});

// POST /:id/generate-pairings — generate pairings (random or smart)
mixersRouter.post(
  "/:id/generate-pairings",
  zValidator("json", generatePairingsSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { mode } = c.req.valid("json");

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        include: {
          activity: true,
          participants: {
            include: {
              user: {
                include: { interests: true },
              },
            },
          },
        },
      });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      const groupAParticipants = mixer.participants
        .filter((p) => p.groupId === mixer.groupAId)
        .map((p) => p.user);
      const groupBParticipants = mixer.participants
        .filter((p) => p.groupId === mixer.groupBId)
        .map((p) => p.user);

      if (groupAParticipants.length === 0 || groupBParticipants.length === 0) {
        return c.json({ error: "Both groups must have participants" }, 400);
      }

      let pairingData: { userAId: string; userBId: string }[] = [];

      if (mode === "random") {
        // Shuffle group B and pair sequentially with group A
        const shuffledB = [...groupBParticipants].sort(() => Math.random() - 0.5);
        const minLen = Math.min(groupAParticipants.length, shuffledB.length);
        for (let i = 0; i < minLen; i++) {
          const a = groupAParticipants[i];
          const b = shuffledB[i];
          if (a && b) {
            pairingData.push({ userAId: a.id, userBId: b.id });
          }
        }
      } else {
        // Smart: use Hungarian algorithm with scoring
        const blocks = await db.block.findMany({
          where: {
            OR: [
              {
                blockerId: {
                  in: [
                    ...groupAParticipants.map((u) => u.id),
                    ...groupBParticipants.map((u) => u.id),
                  ],
                },
              },
            ],
          },
          select: { blockerId: true, blockedId: true },
        });

        const blockPairs: [string, string][] = blocks.map((b) => [
          b.blockerId,
          b.blockedId,
        ]);

        const smartResults = runSmartPairing(
          groupAParticipants,
          groupBParticipants,
          mixer.activity,
          blockPairs,
        );

        pairingData = smartResults.map((r) => ({
          userAId: r.userAId,
          userBId: r.userBId,
        }));
      }

      // Delete existing pairings, then create new ones
      const pairings = await db.$transaction(async (tx) => {
        await tx.pairing.deleteMany({ where: { mixerId } });
        const created = await Promise.all(
          pairingData.map((p) =>
            tx.pairing.create({
              data: { mixerId, userAId: p.userAId, userBId: p.userBId },
            }),
          ),
        );
        return created;
      });

      return c.json({ pairings, mode, count: pairings.length });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to generate pairings" }, 500);
    }
  },
);

const saveManualPairingsSchema = z.object({
  pairings: z.array(
    z.object({ userAId: z.string(), userBId: z.string() }),
  ),
});

// PUT /:id/pairings — save manual pairings
mixersRouter.put(
  "/:id/pairings",
  zValidator("json", saveManualPairingsSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { pairings: pairingData } = c.req.valid("json");

      const pairings = await db.$transaction(async (tx) => {
        await tx.pairing.deleteMany({ where: { mixerId } });
        const created = await Promise.all(
          pairingData.map((p) =>
            tx.pairing.create({
              data: { mixerId, userAId: p.userAId, userBId: p.userBId },
            }),
          ),
        );
        return created;
      });

      return c.json({ pairings });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to save pairings" }, 500);
    }
  },
);

const feedbackSchema = z.object({
  userId: z.string(),
  conversationRating: z.number().int().min(1).max(5).optional(),
  activityRating: z.number().int().min(1).max(5).optional(),
  wouldMixAgain: z.boolean().optional(),
  notes: z.string().optional(),
});

// POST /:id/feedback — submit feedback
mixersRouter.post(
  "/:id/feedback",
  zValidator("json", feedbackSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { userId, conversationRating, activityRating, wouldMixAgain, notes } =
        c.req.valid("json");

      const feedback = await db.mixerFeedback.upsert({
        where: { mixerId_userId: { mixerId, userId } },
        create: {
          mixerId,
          userId,
          conversationRating,
          activityRating,
          wouldMixAgain,
          notes,
        },
        update: { conversationRating, activityRating, wouldMixAgain, notes },
      });

      return c.json({ feedback }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to submit feedback" }, 500);
    }
  },
);

const reshuffleSchema = z.object({
  mode: z.enum(["random", "smart"]),
  requesterId: z.string(), // Who is requesting reshuffle
});

// POST /:id/reshuffle — regenerate pairings during live mixer
mixersRouter.post(
  "/:id/reshuffle",
  zValidator("json", reshuffleSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { mode, requesterId } = c.req.valid("json");

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        include: {
          activity: true,
          participants: {
            include: {
              user: {
                include: { interests: true },
              },
            },
          },
        },
      });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      // Only allow reshuffle during live status
      if (mixer.status !== "live") {
        return c.json({ error: "Reshuffle only allowed when mixer is live" }, 400);
      }

      // Authorization: check if requester is admin/social_chair of either group
      const membershipA = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: mixer.groupAId, userId: requesterId } },
      });
      const membershipB = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: mixer.groupBId, userId: requesterId } },
      });
      const isAdmin =
        membershipA?.role === "social_chair" || membershipA?.role === "admin" ||
        membershipB?.role === "social_chair" || membershipB?.role === "admin";

      if (!isAdmin) {
        return c.json({ error: "Only group admins can reshuffle pairings" }, 403);
      }

      const groupAParticipants = mixer.participants
        .filter((p) => p.groupId === mixer.groupAId)
        .map((p) => p.user);
      const groupBParticipants = mixer.participants
        .filter((p) => p.groupId === mixer.groupBId)
        .map((p) => p.user);

      if (groupAParticipants.length === 0 || groupBParticipants.length === 0) {
        return c.json({ error: "Both groups must have participants" }, 400);
      }

      let pairingData: { userAId: string; userBId: string }[] = [];

      if (mode === "random") {
        const shuffledB = [...groupBParticipants].sort(() => Math.random() - 0.5);
        const minLen = Math.min(groupAParticipants.length, shuffledB.length);
        for (let i = 0; i < minLen; i++) {
          const a = groupAParticipants[i];
          const b = shuffledB[i];
          if (a && b) {
            pairingData.push({ userAId: a.id, userBId: b.id });
          }
        }
      } else {
        const blocks = await db.block.findMany({
          where: {
            OR: [
              {
                blockerId: {
                  in: [
                    ...groupAParticipants.map((u) => u.id),
                    ...groupBParticipants.map((u) => u.id),
                  ],
                },
              },
            ],
          },
          select: { blockerId: true, blockedId: true },
        });

        const blockPairs: [string, string][] = blocks.map((b) => [
          b.blockerId,
          b.blockedId,
        ]);

        const smartResults = runSmartPairing(
          groupAParticipants,
          groupBParticipants,
          mixer.activity,
          blockPairs,
        );

        pairingData = smartResults.map((r) => ({
          userAId: r.userAId,
          userBId: r.userBId,
        }));
      }

      // Delete existing pairings, then create new ones (all revealed since we're live)
      const pairings = await db.$transaction(async (tx) => {
        await tx.pairing.deleteMany({ where: { mixerId } });
        const created = await Promise.all(
          pairingData.map((p) =>
            tx.pairing.create({
              data: { mixerId, userAId: p.userAId, userBId: p.userBId, revealed: true },
            }),
          ),
        );
        return created;
      });

      return c.json({ pairings, mode, count: pairings.length, reshuffled: true });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to reshuffle pairings" }, 500);
    }
  },
);

// ============================================================
// MIXER CHANGE REQUESTS
// ============================================================

const changeRequestSchema = z.object({
  requestingGroupId: z.string(),
  proposedStart: z.string(),
  proposedEnd: z.string().optional(),
  proposedLocation: z.string(),
  proposedActivityId: z.string().optional(),
  message: z.string().optional(),
  createdById: z.string(),
});

const respondChangeSchema = z.object({
  response: z.enum(["accepted", "declined"]),
  responderId: z.string(),
});

// POST /:id/change-requests — create a change request (social_chair only)
mixersRouter.post(
  "/:id/change-requests",
  zValidator("json", changeRequestSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const body = c.req.valid("json");

      const mixer = await db.mixer.findUnique({ where: { id: mixerId } });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);
      if (mixer.status !== "upcoming") {
        return c.json({ error: "Can only request changes on upcoming mixers" }, 400);
      }

      // Verify requester is social_chair/admin of the requesting group
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: body.requestingGroupId, userId: body.createdById } },
      });
      const isAdmin = membership?.role === "social_chair" || membership?.role === "admin";
      if (!isAdmin) {
        return c.json({ error: "Only group admins can request mixer changes" }, 403);
      }

      // Verify requesting group is one of the mixer's groups
      if (body.requestingGroupId !== mixer.groupAId && body.requestingGroupId !== mixer.groupBId) {
        return c.json({ error: "Group is not part of this mixer" }, 403);
      }

      // Cancel any existing pending change request from this group
      await db.mixerChangeRequest.updateMany({
        where: { mixerId, requestingGroupId: body.requestingGroupId, status: "pending" },
        data: { status: "declined" },
      });

      const changeRequest = await db.mixerChangeRequest.create({
        data: {
          mixerId,
          requestingGroupId: body.requestingGroupId,
          proposedStart: new Date(body.proposedStart),
          proposedEnd: body.proposedEnd ? new Date(body.proposedEnd) : null,
          proposedLocation: body.proposedLocation,
          proposedActivityId: body.proposedActivityId ?? null,
          message: body.message ?? null,
          createdById: body.createdById,
        },
        include: { mixer: { include: { groupA: true, groupB: true, activity: true } } },
      });

      // Post a system message into the mixer's chat room so both social chairs see it
      // Find or create the chat room (room may not exist yet if neither chair has opened chat)
      let chatRoom = await db.chatRoom.findFirst({ where: { type: "mixer", mixerId } });
      if (!chatRoom) {
        const fullMixer = changeRequest.mixer;
        const roomName = `${fullMixer.groupA.name} x ${fullMixer.groupB.name}`;
        chatRoom = await db.chatRoom.create({
          data: { type: "mixer", mixerId, name: roomName },
        });
      }
      await db.chatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: body.createdById,
          text: "Change Requested",
          messageType: "change_request",
          changeRequestId: changeRequest.id,
        },
      });
      await db.chatRoom.update({
        where: { id: chatRoom.id },
        data: { lastMessageAt: new Date() },
      });

      return c.json({ changeRequest }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create change request" }, 500);
    }
  },
);

// GET /:id/change-requests — get pending change requests for a mixer
mixersRouter.get("/:id/change-requests", async (c) => {
  try {
    const mixerId = c.req.param("id");

    const changeRequests = await db.mixerChangeRequest.findMany({
      where: { mixerId, status: "pending" },
      include: {
        mixer: { include: { groupA: true, groupB: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ changeRequests });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch change requests" }, 500);
  }
});

// POST /:id/change-requests/:crId/respond — accept or decline (other group's social_chair)
mixersRouter.post(
  "/:id/change-requests/:crId/respond",
  zValidator("json", respondChangeSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const crId = c.req.param("crId");
      const { response, responderId } = c.req.valid("json");

      const changeRequest = await db.mixerChangeRequest.findUnique({ where: { id: crId } });
      if (!changeRequest || changeRequest.mixerId !== mixerId) {
        return c.json({ error: "Change request not found" }, 404);
      }
      if (changeRequest.status !== "pending") {
        return c.json({ error: "Change request already resolved" }, 400);
      }

      const mixer = await db.mixer.findUnique({ where: { id: mixerId } });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      // Responder must be social_chair/admin of the OTHER group (not the requesting group)
      const otherGroupId =
        changeRequest.requestingGroupId === mixer.groupAId ? mixer.groupBId : mixer.groupAId;

      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: otherGroupId, userId: responderId } },
      });
      const isAdmin = membership?.role === "social_chair" || membership?.role === "admin";
      if (!isAdmin) {
        return c.json({ error: "Only the other group's admin can respond to this change request" }, 403);
      }

      if (response === "accepted") {
        // Update mixer details and mark request accepted in a transaction
        await db.$transaction([
          db.mixer.update({
            where: { id: mixerId },
            data: {
              scheduledStart: changeRequest.proposedStart,
              scheduledEnd: changeRequest.proposedEnd ?? null,
              location: changeRequest.proposedLocation,
              activityId: changeRequest.proposedActivityId ?? null,
            },
          }),
          db.mixerChangeRequest.update({
            where: { id: crId },
            data: { status: "accepted" },
          }),
        ]);
      } else {
        await db.mixerChangeRequest.update({
          where: { id: crId },
          data: { status: "declined" },
        });
      }

      const updated = await db.mixerChangeRequest.findUnique({ where: { id: crId } });
      return c.json({ changeRequest: updated });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to respond to change request" }, 500);
    }
  },
);

export { mixersRouter };

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const pairingRequestsRouter = new Hono();

// Helper: Check if user is admin/social_chair of any group in the mixer
async function isMixerAdmin(mixerId: string, userId: string): Promise<boolean> {
  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
    select: { groupAId: true, groupBId: true },
  });

  if (!mixer) return false;

  const membership = await db.groupMember.findFirst({
    where: {
      userId,
      groupId: { in: [mixer.groupAId, mixer.groupBId] },
      role: { in: ["admin", "social_chair"] },
    },
  });

  return !!membership;
}

// Helper: Check if user is a participant in the mixer
async function isParticipant(mixerId: string, userId: string): Promise<boolean> {
  const participant = await db.mixerParticipant.findFirst({
    where: { mixerId, userId },
  });
  return !!participant;
}

// ========================================
// POST / - Create a pairing request
// ========================================
const createSchema = z.object({
  mixerId: z.string(),
  requesterId: z.string(),
  targetId: z.string(),
  message: z.string().max(200).optional(),
});

pairingRequestsRouter.post(
  "/",
  zValidator("json", createSchema),
  async (c) => {
    try {
      const { mixerId, requesterId, targetId, message } = c.req.valid("json");

      // Validate mixer exists and is in valid state
      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        select: { id: true, status: true, groupAId: true, groupBId: true },
      });

      if (!mixer) {
        return c.json({ error: "Mixer not found" }, 404);
      }

      // Can only request pairings before mixer is live
      if (mixer.status !== "upcoming" && mixer.status !== "locked") {
        return c.json({ error: "Pairing requests are only allowed before the mixer starts" }, 400);
      }

      // Validate both users are participants
      const [requesterParticipant, targetParticipant] = await Promise.all([
        db.mixerParticipant.findFirst({
          where: { mixerId, userId: requesterId },
        }),
        db.mixerParticipant.findFirst({
          where: { mixerId, userId: targetId },
        }),
      ]);

      if (!requesterParticipant) {
        return c.json({ error: "You are not a participant in this mixer" }, 403);
      }

      if (!targetParticipant) {
        return c.json({ error: "Target user is not a participant in this mixer" }, 400);
      }

      // Can't request to pair with someone from same group
      if (requesterParticipant.groupId === targetParticipant.groupId) {
        return c.json({ error: "Cannot request pairing with someone from your own group" }, 400);
      }

      // Check for blocks
      const blocked = await db.block.findFirst({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: targetId },
            { blockerId: targetId, blockedId: requesterId },
          ],
        },
      });

      if (blocked) {
        return c.json({ error: "Cannot request pairing with this user" }, 400);
      }

      // Check if already requested
      const existing = await db.pairingRequest.findUnique({
        where: {
          mixerId_requesterId_targetId: { mixerId, requesterId, targetId },
        },
      });

      if (existing) {
        return c.json({ error: "You have already requested to pair with this person" }, 400);
      }

      // Create the request
      const request = await db.pairingRequest.create({
        data: {
          mixerId,
          requesterId,
          targetId,
          message,
        },
        include: {
          requester: {
            select: { id: true, name: true, avatarUrl: true },
          },
          target: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      return c.json({ request }, 201);
    } catch (err) {
      console.error("[PairingRequests] Create error:", err);
      return c.json({ error: "Failed to create pairing request" }, 500);
    }
  }
);

// ========================================
// GET /mixer/:mixerId - Get all pairing requests for a mixer (ADMIN ONLY)
// ========================================
pairingRequestsRouter.get("/mixer/:mixerId", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    // Only admins can see all requests
    if (!await isMixerAdmin(mixerId, userId)) {
      return c.json({ error: "Only admins can view pairing requests" }, 403);
    }

    const requests = await db.pairingRequest.findMany({
      where: { mixerId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            yearInSchool: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            yearInSchool: true,
          },
        },
        decidedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by target to see who is most requested
    const targetCounts = new Map<string, number>();
    for (const req of requests) {
      const count = targetCounts.get(req.targetId) ?? 0;
      targetCounts.set(req.targetId, count + 1);
    }

    // Also get mutual requests (A→B and B→A)
    const mutualPairs: Array<{ userA: string; userB: string }> = [];
    for (const req of requests) {
      const reverse = requests.find(
        (r) => r.requesterId === req.targetId && r.targetId === req.requesterId
      );
      if (reverse && req.requesterId < req.targetId) {
        mutualPairs.push({ userA: req.requesterId, userB: req.targetId });
      }
    }

    return c.json({
      requests,
      stats: {
        total: requests.length,
        pending: requests.filter((r) => r.status === "pending").length,
        approved: requests.filter((r) => r.status === "approved").length,
        declined: requests.filter((r) => r.status === "declined").length,
        mutualPairs,
        mostRequested: Array.from(targetCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([userId, count]) => ({ userId, count })),
      },
    });
  } catch (err) {
    console.error("[PairingRequests] List error:", err);
    return c.json({ error: "Failed to fetch pairing requests" }, 500);
  }
});

// ========================================
// GET /my - Get my pairing requests for a mixer
// ========================================
pairingRequestsRouter.get("/my", async (c) => {
  try {
    const mixerId = c.req.query("mixerId");
    const userId = c.req.query("userId");

    if (!mixerId || !userId) {
      return c.json({ error: "mixerId and userId are required" }, 400);
    }

    // User can see requests they made
    const myRequests = await db.pairingRequest.findMany({
      where: { mixerId, requesterId: userId },
      include: {
        target: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ requests: myRequests });
  } catch (err) {
    console.error("[PairingRequests] My requests error:", err);
    return c.json({ error: "Failed to fetch your pairing requests" }, 500);
  }
});

// ========================================
// PUT /:id/decide - Admin decides on a pairing request
// ========================================
const decideSchema = z.object({
  adminId: z.string(),
  decision: z.enum(["approved", "declined"]),
});

pairingRequestsRouter.put(
  "/:id/decide",
  zValidator("json", decideSchema),
  async (c) => {
    try {
      const requestId = c.req.param("id");
      const { adminId, decision } = c.req.valid("json");

      const request = await db.pairingRequest.findUnique({
        where: { id: requestId },
        include: { mixer: true },
      });

      if (!request) {
        return c.json({ error: "Pairing request not found" }, 404);
      }

      // Verify admin status
      if (!await isMixerAdmin(request.mixerId, adminId)) {
        return c.json({ error: "Only admins can decide on pairing requests" }, 403);
      }

      // Can only decide on pending requests
      if (request.status !== "pending") {
        return c.json({ error: "Request has already been decided" }, 400);
      }

      // Update the request
      const updated = await db.pairingRequest.update({
        where: { id: requestId },
        data: {
          status: decision,
          decidedById: adminId,
          decidedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, name: true } },
          target: { select: { id: true, name: true } },
        },
      });

      return c.json({ request: updated });
    } catch (err) {
      console.error("[PairingRequests] Decide error:", err);
      return c.json({ error: "Failed to decide on pairing request" }, 500);
    }
  }
);

// ========================================
// DELETE /:id - Cancel a pairing request (only by requester)
// ========================================
pairingRequestsRouter.delete("/:id", async (c) => {
  try {
    const requestId = c.req.param("id");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const request = await db.pairingRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return c.json({ error: "Pairing request not found" }, 404);
    }

    // Only the requester can cancel
    if (request.requesterId !== userId) {
      return c.json({ error: "Only the requester can cancel this request" }, 403);
    }

    // Can only cancel pending requests
    if (request.status !== "pending") {
      return c.json({ error: "Cannot cancel a request that has been decided" }, 400);
    }

    await db.pairingRequest.delete({
      where: { id: requestId },
    });

    return c.json({ success: true });
  } catch (err) {
    console.error("[PairingRequests] Delete error:", err);
    return c.json({ error: "Failed to cancel pairing request" }, 500);
  }
});

// ========================================
// POST /mixer/:mixerId/finalize - Admin finalizes all pairings based on requests
// ========================================
const finalizeSchema = z.object({
  adminId: z.string(),
  pairings: z.array(z.object({
    userAId: z.string(),
    userBId: z.string(),
  })),
});

pairingRequestsRouter.post(
  "/mixer/:mixerId/finalize",
  zValidator("json", finalizeSchema),
  async (c) => {
    try {
      const mixerId = c.req.param("mixerId");
      const { adminId, pairings } = c.req.valid("json");

      // Verify admin
      if (!await isMixerAdmin(mixerId, adminId)) {
        return c.json({ error: "Only admins can finalize pairings" }, 403);
      }

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
      });

      if (!mixer) {
        return c.json({ error: "Mixer not found" }, 404);
      }

      if (mixer.status === "live" || mixer.status === "completed") {
        return c.json({ error: "Cannot modify pairings after mixer has started" }, 400);
      }

      // Delete existing pairings
      await db.pairing.deleteMany({
        where: { mixerId },
      });

      // Create new pairings
      const createdPairings = await Promise.all(
        pairings.map((p) =>
          db.pairing.create({
            data: {
              mixerId,
              userAId: p.userAId,
              userBId: p.userBId,
              revealed: false,
            },
          })
        )
      );

      // Mark all pending requests as either approved (if in final pairings) or declined
      const pairedUsers = new Set(
        pairings.flatMap((p) => [p.userAId, p.userBId])
      );

      // Get all pending requests for this mixer
      const pendingRequests = await db.pairingRequest.findMany({
        where: { mixerId, status: "pending" },
      });

      for (const req of pendingRequests) {
        // Check if this request was "fulfilled" - the requester was paired with their target
        const pairing = pairings.find(
          (p) =>
            (p.userAId === req.requesterId && p.userBId === req.targetId) ||
            (p.userBId === req.requesterId && p.userAId === req.targetId)
        );

        await db.pairingRequest.update({
          where: { id: req.id },
          data: {
            status: pairing ? "approved" : "declined",
            decidedById: adminId,
            decidedAt: new Date(),
          },
        });
      }

      // Lock pairings
      await db.mixer.update({
        where: { id: mixerId },
        data: { pairingLocked: true, pairingMode: "manual" },
      });

      return c.json({
        pairings: createdPairings,
        message: `Created ${createdPairings.length} pairings`,
      });
    } catch (err) {
      console.error("[PairingRequests] Finalize error:", err);
      return c.json({ error: "Failed to finalize pairings" }, 500);
    }
  }
);

// ========================================
// GET /mixer/:mixerId/suggestions - Get suggested pairings based on requests
// ========================================
pairingRequestsRouter.get("/mixer/:mixerId/suggestions", async (c) => {
  try {
    const mixerId = c.req.param("mixerId");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    if (!await isMixerAdmin(mixerId, userId)) {
      return c.json({ error: "Only admins can view suggestions" }, 403);
    }

    // Get all pending requests
    const requests = await db.pairingRequest.findMany({
      where: { mixerId, status: "pending" },
      include: {
        requester: { select: { id: true, name: true, avatarUrl: true } },
        target: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Find mutual requests (both requested each other)
    const mutualPairs: Array<{
      userA: { id: string; name: string; avatarUrl: string | null };
      userB: { id: string; name: string; avatarUrl: string | null };
      confidence: "mutual" | "one-way";
    }> = [];

    const processed = new Set<string>();

    for (const req of requests) {
      const key = [req.requesterId, req.targetId].sort().join("-");
      if (processed.has(key)) continue;
      processed.add(key);

      const reverse = requests.find(
        (r) => r.requesterId === req.targetId && r.targetId === req.requesterId
      );

      if (reverse) {
        // Mutual request - high confidence
        mutualPairs.push({
          userA: req.requester,
          userB: req.target,
          confidence: "mutual",
        });
      }
    }

    // Get participants for reference
    const participants = await db.mixerParticipant.findMany({
      where: { mixerId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return c.json({
      mutualPairs,
      requests,
      participants: participants.map((p) => ({
        ...p.user,
        groupId: p.groupId,
        groupName: p.group.name,
      })),
    });
  } catch (err) {
    console.error("[PairingRequests] Suggestions error:", err);
    return c.json({ error: "Failed to get suggestions" }, 500);
  }
});

export { pairingRequestsRouter };

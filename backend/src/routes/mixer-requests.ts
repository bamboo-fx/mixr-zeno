import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const mixerRequestsRouter = new Hono();

const CLAREMONT_COLLEGE_IDS = new Set(['hmc01', 'pom01', 'cmc01', 'scr01', 'pit01']);

function isSameCollegeCommunity(collegeIdA: string, collegeIdB: string): boolean {
  if (collegeIdA === collegeIdB) return true;
  return CLAREMONT_COLLEGE_IDS.has(collegeIdA) && CLAREMONT_COLLEGE_IDS.has(collegeIdB);
}

// Helper: Check if user has admin/social_chair role in group
async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership?.role === "social_chair" || membership?.role === "admin";
}

// GET / — list mixer requests for a group (required ?groupId=)
// Returns both inbound (invited) and outbound (requester) requests
mixerRequestsRouter.get("/", async (c) => {
  try {
    const groupId = c.req.query("groupId");
    if (!groupId) {
      return c.json({ error: "groupId query param is required" }, 400);
    }

    // Fetch outbound requests (where this group is the requester, not dismissed)
    const outbound = await db.mixerRequest.findMany({
      where: { requestingGroupId: groupId, dismissedByRequester: false },
      include: {
        requestingGroup: true,
        receivingGroup: true,
        proposedActivity: true,
        counterActivity: true,
        college: true,
        invites: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch inbound invites (where this group has an invite)
    const inboundInvites = await db.mixerRequestInvite.findMany({
      where: { invitedGroupId: groupId },
      include: {
        request: {
          include: {
            requestingGroup: true,
            receivingGroup: true,
            proposedActivity: true,
            counterActivity: true,
            college: true,
            invites: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also check old-style requests where group is receivingGroupId (backwards compat)
    const oldStyleInbound = await db.mixerRequest.findMany({
      where: {
        receivingGroupId: groupId,
        invites: { none: {} }, // Only get requests without new-style invites
      },
      include: {
        requestingGroup: true,
        receivingGroup: true,
        proposedActivity: true,
        counterActivity: true,
        college: true,
        invites: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      outbound,
      inbound: inboundInvites.map(inv => ({
        ...inv.request,
        myInvite: {
          id: inv.id,
          status: inv.status,
          respondedAt: inv.respondedAt,
        },
      })),
      oldStyleInbound,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch mixer requests" }, 500);
  }
});

// GET /for-group/:groupId — Enhanced endpoint with "also invited" info
mixerRequestsRouter.get("/for-group/:groupId", async (c) => {
  try {
    const groupId = c.req.param("groupId");

    // Fetch all invites for this group with full request details
    const invites = await db.mixerRequestInvite.findMany({
      where: { invitedGroupId: groupId },
      include: {
        request: {
          include: {
            requestingGroup: { select: { id: true, name: true, coverImageUrl: true } },
            proposedActivity: { select: { id: true, name: true } },
            college: { select: { id: true, name: true } },
            invites: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch all outbound requests from this group (not dismissed)
    const outboundRequests = await db.mixerRequest.findMany({
      where: { requestingGroupId: groupId, dismissedByRequester: false },
      include: {
        requestingGroup: { select: { id: true, name: true, coverImageUrl: true } },
        proposedActivity: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        invites: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all invited group names for the inbound invites
    const allInvitedGroupIds = new Set<string>();
    invites.forEach(inv => {
      inv.request.invites.forEach(i => allInvitedGroupIds.add(i.invitedGroupId));
    });
    outboundRequests.forEach(req => {
      req.invites.forEach(i => allInvitedGroupIds.add(i.invitedGroupId));
    });

    const invitedGroups = await db.group.findMany({
      where: { id: { in: Array.from(allInvitedGroupIds) } },
      select: { id: true, name: true, coverImageUrl: true },
    });
    const groupMap = new Map(invitedGroups.map(g => [g.id, g]));

    // Format inbound invites with "also invited" info
    const inbound = invites.map(inv => {
      const otherInvites = inv.request.invites
        .filter(i => i.invitedGroupId !== groupId)
        .map(i => ({
          inviteId: i.id,
          groupId: i.invitedGroupId,
          groupName: groupMap.get(i.invitedGroupId)?.name ?? "Unknown",
          status: i.status,
        }));

      return {
        requestId: inv.request.id,
        inviteId: inv.id,
        myStatus: inv.status,
        respondedAt: inv.respondedAt,
        requesterGroup: inv.request.requestingGroup,
        proposedStart: inv.request.proposedStart,
        proposedEnd: inv.request.proposedEnd,
        proposedLocation: inv.request.proposedLocation,
        proposedActivity: inv.request.proposedActivity,
        message: inv.request.message,
        requestStatus: inv.request.status,
        college: inv.request.college,
        createdAt: inv.request.createdAt,
        alsoInvited: otherInvites,
        totalInvited: inv.request.invites.length,
      };
    });

    // Format outbound requests
    const outbound = outboundRequests.map(req => {
      const inviteStatuses = req.invites.map(i => ({
        inviteId: i.id,
        groupId: i.invitedGroupId,
        groupName: groupMap.get(i.invitedGroupId)?.name ?? "Unknown",
        groupCoverImage: groupMap.get(i.invitedGroupId)?.coverImageUrl,
        status: i.status,
        respondedAt: i.respondedAt,
      }));

      return {
        requestId: req.id,
        requesterGroup: req.requestingGroup,
        proposedStart: req.proposedStart,
        proposedEnd: req.proposedEnd,
        proposedLocation: req.proposedLocation,
        proposedActivity: req.proposedActivity,
        message: req.message,
        requestStatus: req.status,
        college: req.college,
        createdAt: req.createdAt,
        invitedGroups: inviteStatuses,
        acceptedCount: inviteStatuses.filter(i => i.status === "accepted").length,
        pendingCount: inviteStatuses.filter(i => i.status === "pending").length,
        declinedCount: inviteStatuses.filter(i => i.status === "declined").length,
      };
    });

    return c.json({ inbound, outbound });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch requests for group" }, 500);
  }
});

// ========================================
// MULTI-GROUP MIXER REQUEST CREATION
// ========================================

const createMultiMixerRequestSchema = z.object({
  collegeId: z.string(),
  requestingGroupId: z.string(),
  invitedGroupIds: z.array(z.string()).min(1, "Must invite at least one group"),
  proposedStart: z.string().datetime(),
  proposedEnd: z.string().datetime().optional(),
  proposedLocation: z.string(),
  proposedActivityId: z.string().optional(),
  surpriseActivity: z.boolean().optional(),
  isOpenMixer: z.boolean().optional(),
  message: z.string().optional(),
  createdById: z.string(),
});

// POST /multi — create multi-group mixer request
mixerRequestsRouter.post(
  "/multi",
  zValidator("json", createMultiMixerRequestSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");

      // Authorization check: creator must be admin/social_chair of requesting group
      if (!await isGroupAdmin(body.requestingGroupId, body.createdById)) {
        return c.json({ error: "Only admins and social chairs can create mixer requests" }, 403);
      }

      // Validate all invited groups are in the same college
      const invitedGroups = await db.group.findMany({
        where: { id: { in: body.invitedGroupIds } },
        select: { id: true, collegeId: true, name: true },
      });

      if (invitedGroups.length !== body.invitedGroupIds.length) {
        return c.json({ error: "One or more invited groups not found" }, 400);
      }

      const wrongCollege = invitedGroups.filter(g => !isSameCollegeCommunity(g.collegeId, body.collegeId));
      if (wrongCollege.length > 0) {
        return c.json({ error: "All invited groups must be in the same college community" }, 400);
      }

      // Prevent inviting your own group
      if (body.invitedGroupIds.includes(body.requestingGroupId)) {
        return c.json({ error: "Cannot invite your own group" }, 400);
      }

      // Check for duplicate pending requests
      const existingRequests = await db.mixerRequest.findMany({
        where: {
          requestingGroupId: body.requestingGroupId,
          status: "pending",
          invites: {
            some: {
              invitedGroupId: { in: body.invitedGroupIds },
              status: "pending",
            },
          },
        },
      });

      if (existingRequests.length > 0) {
        return c.json({ error: "A pending request to one or more of these groups already exists" }, 400);
      }

      // Create request with invites in a transaction
      const result = await db.$transaction(async (tx) => {
        // Use first invited group as receivingGroupId for backwards compat
        const request = await tx.mixerRequest.create({
          data: {
            collegeId: body.collegeId,
            requestingGroupId: body.requestingGroupId,
            receivingGroupId: body.invitedGroupIds[0]!, // First invited group
            proposedStart: new Date(body.proposedStart),
            proposedEnd: body.proposedEnd ? new Date(body.proposedEnd) : null,
            proposedLocation: body.proposedLocation,
            proposedActivityId: body.proposedActivityId,
            surpriseActivity: body.surpriseActivity ?? false,
            isOpenMixer: body.isOpenMixer ?? false,
            message: body.message,
            createdById: body.createdById,
            status: "pending",
          },
        });

        // Create invites for all invited groups
        const invites = await Promise.all(
          body.invitedGroupIds.map(groupId =>
            tx.mixerRequestInvite.create({
              data: {
                requestId: request.id,
                invitedGroupId: groupId,
                status: "pending",
              },
            })
          )
        );

        return { request, invites, invitedGroups };
      });

      return c.json({
        request: result.request,
        invites: result.invites,
        invitedGroups: result.invitedGroups,
      }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create multi-group mixer request" }, 500);
    }
  },
);

// ========================================
// RESPOND TO INVITE (ACCEPT/DECLINE)
// ========================================

const respondToInviteSchema = z.object({
  responderId: z.string(),
  response: z.enum(["accepted", "declined"]),
});

// POST /invite/:inviteId/respond — respond to a specific invite
mixerRequestsRouter.post(
  "/invite/:inviteId/respond",
  zValidator("json", respondToInviteSchema),
  async (c) => {
    try {
      const inviteId = c.req.param("inviteId");
      const { responderId, response } = c.req.valid("json");

      // Get the invite with request details
      const invite = await db.mixerRequestInvite.findUnique({
        where: { id: inviteId },
        include: {
          request: {
            include: {
              invites: true,
            },
          },
        },
      });

      if (!invite) {
        return c.json({ error: "Invite not found" }, 404);
      }

      if (invite.status !== "pending") {
        return c.json({ error: "Invite has already been responded to" }, 400);
      }

      // Authorization check: responder must be admin/social_chair of invited group
      if (!await isGroupAdmin(invite.invitedGroupId, responderId)) {
        return c.json({ error: "Only admins and social chairs can respond to invites" }, 403);
      }

      // Update invite
      const updatedInvite = await db.mixerRequestInvite.update({
        where: { id: inviteId },
        data: {
          status: response,
          respondedById: responderId,
          respondedAt: new Date(),
        },
      });

      let mixer = null;
      let requestUpdate = null;

      // If accepted, create or update mixer
      if (response === "accepted") {
        // Check if a mixer already exists for this request
        const existingMixer = await db.mixer.findFirst({
          where: {
            OR: [
              { groupAId: invite.request.requestingGroupId },
              { groupBId: invite.request.requestingGroupId },
            ],
            scheduledStart: invite.request.proposedStart,
            location: invite.request.proposedLocation,
          },
        });

        if (existingMixer) {
          // Add this group to the mixer via MixerGroup
          await db.mixerGroup.upsert({
            where: {
              mixerId_groupId: {
                mixerId: existingMixer.id,
                groupId: invite.invitedGroupId,
              },
            },
            create: {
              mixerId: existingMixer.id,
              groupId: invite.invitedGroupId,
            },
            update: {},
          });
          mixer = existingMixer;
        } else {
          // Create new mixer with requester and this acceptor
          mixer = await db.mixer.create({
            data: {
              collegeId: invite.request.collegeId,
              groupAId: invite.request.requestingGroupId,
              groupBId: invite.invitedGroupId,
              scheduledStart: invite.request.proposedStart,
              scheduledEnd: invite.request.proposedEnd ?? null,
              location: invite.request.proposedLocation,
              activityId: invite.request.proposedActivityId,
              status: "upcoming",
            },
          });

          // Add both groups to MixerGroup table
          await db.mixerGroup.createMany({
            data: [
              { mixerId: mixer.id, groupId: invite.request.requestingGroupId },
              { mixerId: mixer.id, groupId: invite.invitedGroupId },
            ],
          });
        }

        // Update request status to active
        requestUpdate = await db.mixerRequest.update({
          where: { id: invite.requestId },
          data: { status: "active" },
        });

        // Mark remaining pending invites as expired (MVP behavior)
        await db.mixerRequestInvite.updateMany({
          where: {
            requestId: invite.requestId,
            status: "pending",
            id: { not: inviteId },
          },
          data: { status: "declined" }, // Auto-decline remaining
        });
      }

      // Check if all invites are now responded (for declined case)
      const allInvites = await db.mixerRequestInvite.findMany({
        where: { requestId: invite.requestId },
      });

      const allDeclined = allInvites.every(i => i.status === "declined");
      if (allDeclined) {
        requestUpdate = await db.mixerRequest.update({
          where: { id: invite.requestId },
          data: { status: "expired" },
        });
      }

      return c.json({
        invite: updatedInvite,
        mixer,
        request: requestUpdate,
      });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to respond to invite" }, 500);
    }
  },
);

// ========================================
// LEGACY ENDPOINTS (BACKWARDS COMPAT)
// ========================================

const createMixerRequestSchema = z.object({
  collegeId: z.string(),
  requestingGroupId: z.string(),
  receivingGroupId: z.string(),
  proposedStart: z.string().datetime(),
  proposedLocation: z.string(),
  proposedActivityId: z.string().optional(),
  surpriseActivity: z.boolean().optional(),
  isOpenMixer: z.boolean().optional(),
  message: z.string().optional(),
  createdById: z.string(),
});

// POST / — create single-group mixer request (backwards compat)
// Internally creates with invites array
mixerRequestsRouter.post(
  "/",
  zValidator("json", createMixerRequestSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");

      // Authorization check: creator must be admin/social_chair of requesting group
      if (!await isGroupAdmin(body.requestingGroupId, body.createdById)) {
        return c.json({ error: "Only admins and social chairs can create mixer requests" }, 403);
      }

      const result = await db.$transaction(async (tx) => {
        const request = await tx.mixerRequest.create({
          data: {
            collegeId: body.collegeId,
            requestingGroupId: body.requestingGroupId,
            receivingGroupId: body.receivingGroupId,
            proposedStart: new Date(body.proposedStart),
            proposedLocation: body.proposedLocation,
            proposedActivityId: body.proposedActivityId,
            surpriseActivity: body.surpriseActivity ?? false,
            isOpenMixer: body.isOpenMixer ?? false,
            message: body.message,
            createdById: body.createdById,
          },
        });

        // Create single invite for backwards compat
        await tx.mixerRequestInvite.create({
          data: {
            requestId: request.id,
            invitedGroupId: body.receivingGroupId,
            status: "pending",
          },
        });

        return request;
      });

      const request = await db.mixerRequest.findUnique({
        where: { id: result.id },
        include: {
          requestingGroup: true,
          receivingGroup: true,
          proposedActivity: true,
          college: true,
          invites: true,
        },
      });

      return c.json({ request }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create mixer request" }, 500);
    }
  },
);

const respondMixerRequestSchema = z.object({
  action: z.enum(["accept", "decline", "counter"]),
  responderId: z.string(),
  counterStart: z.string().datetime().optional(),
  counterLocation: z.string().optional(),
  counterActivityId: z.string().optional(),
});

// PUT /:id — respond to a mixer request (legacy - works on first invite)
mixerRequestsRouter.put(
  "/:id",
  zValidator("json", respondMixerRequestSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { action, responderId, counterStart, counterLocation, counterActivityId } =
        c.req.valid("json");

      const existing = await db.mixerRequest.findUnique({
        where: { id },
        include: { invites: true },
      });
      if (!existing) return c.json({ error: "Mixer request not found" }, 404);

      // Authorization check: responder must be admin/social_chair of receiving group
      if (!await isGroupAdmin(existing.receivingGroupId, responderId)) {
        return c.json({ error: "Only admins and social chairs of receiving group can respond" }, 403);
      }

      if (action === "decline") {
        // Update invite if exists
        const invite = existing.invites.find(i => i.invitedGroupId === existing.receivingGroupId);
        if (invite) {
          await db.mixerRequestInvite.update({
            where: { id: invite.id },
            data: { status: "declined", respondedById: responderId, respondedAt: new Date() },
          });
        }

        const request = await db.mixerRequest.update({
          where: { id },
          data: { status: "declined" },
        });
        return c.json({ request });
      }

      if (action === "counter") {
        const request = await db.mixerRequest.update({
          where: { id },
          data: {
            status: "countered",
            counterStart: counterStart ? new Date(counterStart) : undefined,
            counterLocation,
            counterActivityId,
          },
        });
        return c.json({ request });
      }

      // action === "accept": update request and create Mixer
      const result = await db.$transaction(async (tx) => {
        // Update invite if exists
        const invite = existing.invites.find(i => i.invitedGroupId === existing.receivingGroupId);
        if (invite) {
          await tx.mixerRequestInvite.update({
            where: { id: invite.id },
            data: { status: "accepted", respondedById: responderId, respondedAt: new Date() },
          });
        }

        const request = await tx.mixerRequest.update({
          where: { id },
          data: { status: "accepted" },
        });

        const mixer = await tx.mixer.create({
          data: {
            collegeId: existing.collegeId,
            groupAId: existing.requestingGroupId,
            groupBId: existing.receivingGroupId,
            scheduledStart: existing.proposedStart,
            location: existing.proposedLocation,
            activityId: existing.proposedActivityId,
            status: "upcoming",
          },
          include: {
            groupA: true,
            groupB: true,
            activity: true,
          },
        });

        // Add groups to MixerGroup
        for (const groupId of [existing.requestingGroupId, existing.receivingGroupId]) {
          await tx.mixerGroup.upsert({
            where: {
              mixerId_groupId: { mixerId: mixer.id, groupId },
            },
            create: { mixerId: mixer.id, groupId },
            update: {},
          });
        }

        return { request, mixer };
      });

      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to respond to mixer request" }, 500);
    }
  },
);

// DELETE /:id — cancel mixer request
mixerRequestsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const request = await db.mixerRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return c.json({ request });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to cancel mixer request" }, 500);
  }
});

// POST /:id/dismiss — dismiss a completed/declined/expired/cancelled request from the requester's view
mixerRequestsRouter.post("/:id/dismiss", async (c) => {
  try {
    const id = c.req.param("id");
    await db.mixerRequest.update({
      where: { id },
      data: { dismissedByRequester: true },
    });
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to dismiss mixer request" }, 500);
  }
});

export { mixerRequestsRouter };

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const invitesRouter = new Hono();

// Helper: Check if user has admin/social_chair role in group
async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership?.role === "social_chair" || membership?.role === "admin";
}

// Helper: Create notification
async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  return db.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    },
  });
}

// GET /pending — get pending invites for a user
invitesRouter.get("/pending", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const invites = await db.groupInvite.findMany({
      where: { inviteeId: userId, status: "pending" },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
        inviter: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ invites });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch pending invites" }, 500);
  }
});

// GET /sent — get invites sent by a user for a group
invitesRouter.get("/sent", async (c) => {
  try {
    const groupId = c.req.query("groupId");
    const inviterId = c.req.query("inviterId");

    if (!groupId) {
      return c.json({ error: "groupId is required" }, 400);
    }

    const invites = await db.groupInvite.findMany({
      where: {
        groupId,
        ...(inviterId ? { inviterId } : {}),
      },
      include: {
        invitee: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
        inviter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ invites });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch sent invites" }, 500);
  }
});

const sendInviteSchema = z.object({
  groupId: z.string(),
  inviterId: z.string(),
  inviteeId: z.string(),
});

// POST /send — send invite to a user
invitesRouter.post("/send", zValidator("json", sendInviteSchema), async (c) => {
  try {
    const { groupId, inviterId, inviteeId } = c.req.valid("json");

    // Check if inviter has permission
    if (!(await isGroupAdmin(groupId, inviterId))) {
      return c.json({ error: "Only admins and social chairs can send invites" }, 403);
    }

    // Check if invitee is already a member
    const existingMember = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: inviteeId } },
    });

    if (existingMember) {
      return c.json({ error: "User is already a member of this group" }, 400);
    }

    // Check if invite already exists
    const existingInvite = await db.groupInvite.findUnique({
      where: { groupId_inviteeId: { groupId, inviteeId } },
    });

    if (existingInvite && existingInvite.status === "pending") {
      return c.json({ error: "Invite already pending for this user" }, 400);
    }

    // Get group and inviter info for notification
    const [group, inviter] = await Promise.all([
      db.group.findUnique({ where: { id: groupId } }),
      db.profile.findUnique({ where: { id: inviterId }, select: { name: true } }),
    ]);

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    // Create or update invite
    const invite = await db.groupInvite.upsert({
      where: { groupId_inviteeId: { groupId, inviteeId } },
      create: { groupId, inviterId, inviteeId },
      update: { inviterId, status: "pending", respondedAt: null },
      include: {
        group: true,
        inviter: { select: { id: true, name: true, avatarUrl: true } },
        invitee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Create notification for invitee
    await createNotification(
      inviteeId,
      "group_invite",
      `${inviter?.name ?? "Someone"} invited you`,
      `You've been invited to join ${group.name}`,
      { groupId, inviteId: invite.id, inviterName: inviter?.name, groupName: group.name }
    );

    return c.json({ invite }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to send invite" }, 500);
  }
});

const respondSchema = z.object({
  inviteId: z.string(),
  userId: z.string(),
  response: z.enum(["accepted", "declined"]),
});

// POST /respond — accept or decline an invite
invitesRouter.post("/respond", zValidator("json", respondSchema), async (c) => {
  try {
    const { inviteId, userId, response } = c.req.valid("json");

    // Find the invite
    const invite = await db.groupInvite.findUnique({
      where: { id: inviteId },
      include: {
        group: true,
        inviter: { select: { id: true, name: true } },
        invitee: { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      return c.json({ error: "Invite not found" }, 404);
    }

    if (invite.inviteeId !== userId) {
      return c.json({ error: "Not authorized to respond to this invite" }, 403);
    }

    if (invite.status !== "pending") {
      return c.json({ error: "Invite already responded to" }, 400);
    }

    // Update invite status
    const updatedInvite = await db.groupInvite.update({
      where: { id: inviteId },
      data: { status: response, respondedAt: new Date() },
      include: {
        group: true,
      },
    });

    // If accepted, add user to group
    if (response === "accepted") {
      await db.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId: invite.inviteeId,
          role: "member",
        },
      });

      // Notify inviter that their invite was accepted
      await createNotification(
        invite.inviterId,
        "invite_accepted",
        `${invite.invitee?.name ?? "Someone"} joined ${invite.group.name}`,
        `Your invite was accepted!`,
        { groupId: invite.groupId, inviteeId: invite.inviteeId }
      );
    } else {
      // Notify inviter that their invite was declined
      await createNotification(
        invite.inviterId,
        "invite_declined",
        `Invite declined`,
        `${invite.invitee?.name ?? "Someone"} declined your invite to ${invite.group.name}`,
        { groupId: invite.groupId, inviteeId: invite.inviteeId }
      );
    }

    return c.json({ invite: updatedInvite });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to respond to invite" }, 500);
  }
});

// DELETE /:id — cancel a pending invite (by inviter)
invitesRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const requesterId = c.req.query("requesterId");

    if (!requesterId) {
      return c.json({ error: "requesterId is required" }, 400);
    }

    const invite = await db.groupInvite.findUnique({
      where: { id },
    });

    if (!invite) {
      return c.json({ error: "Invite not found" }, 404);
    }

    // Check if requester is the inviter or a group admin
    if (invite.inviterId !== requesterId && !(await isGroupAdmin(invite.groupId, requesterId))) {
      return c.json({ error: "Not authorized to cancel this invite" }, 403);
    }

    await db.groupInvite.delete({ where: { id } });

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to cancel invite" }, 500);
  }
});

export { invitesRouter };

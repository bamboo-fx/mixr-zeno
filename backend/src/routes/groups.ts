import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const groupsRouter = new Hono();

// Generate a unique 6-letter invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I/L
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique invite code (retry if collision)
async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.group.findFirst({ where: { inviteCode: code } });
    if (!existing) return code;
    code = generateInviteCode();
    attempts++;
  }
  throw new Error("Failed to generate unique invite code");
}

// Helper: Check if user has admin/social_chair role in group
async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership?.role === "social_chair" || membership?.role === "admin";
}

const CLAREMONT_COLLEGE_IDS = ["hmc01", "pom01", "cmc01", "scr01", "pit01"];

// GET / — list groups with optional filters
groupsRouter.get("/", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const collegeIds = c.req.query("collegeIds"); // comma-separated list
    const category = c.req.query("category");
    const search = c.req.query("search");

    // Build college filter — support single or multiple IDs
    let collegeFilter: object = {};
    if (collegeIds) {
      const ids = collegeIds.split(",").filter(Boolean);
      collegeFilter = { collegeId: { in: ids } };
    } else if (collegeId) {
      collegeFilter = { collegeId };
    }

    const groups = await db.group.findMany({
      where: {
        ...collegeFilter,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        college: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Attach total mixer count for each group
    const groupsWithMixerCount = await Promise.all(
      groups.map(async (group) => {
        const totalMixers = await db.mixer.count({
          where: {
            OR: [{ groupAId: group.id }, { groupBId: group.id }],
            status: { in: ["completed", "upcoming", "locked", "live"] },
          },
        });
        return { ...group, totalMixers };
      })
    );

    return c.json({ groups: groupsWithMixerCount });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch groups" }, 500);
  }
});

// GET /top — get top groups by mixer count
groupsRouter.get("/top", async (c) => {
  try {
    const collegeId = c.req.query("collegeId");
    const limit = parseInt(c.req.query("limit") || "10", 10);

    // Get all groups with their mixer counts
    const groups = await db.group.findMany({
      where: collegeId ? { collegeId } : {},
      include: {
        college: true,
        _count: { select: { members: true } },
      },
    });

    // Get mixer counts for each group (as groupA or groupB)
    const groupMixerCounts = await Promise.all(
      groups.map(async (group) => {
        const mixerCount = await db.mixer.count({
          where: {
            OR: [
              { groupAId: group.id },
              { groupBId: group.id },
            ],
            status: { in: ["completed", "upcoming", "locked", "live"] },
          },
        });
        return { ...group, mixerCount };
      })
    );

    // Sort by mixer count descending and take top N
    const topGroups = groupMixerCounts
      .sort((a, b) => b.mixerCount - a.mixerCount)
      .slice(0, limit);

    return c.json({ groups: topGroups });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch top groups" }, 500);
  }
});

// GET /:id — get group by id
groupsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const group = await db.group.findUnique({
      where: { id },
      include: {
        college: true,
        members: { include: { user: true } },
        _count: { select: { members: true } },
      },
    });
    if (!group) return c.json({ error: "Group not found" }, 404);
    return c.json({ group });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch group" }, 500);
  }
});

const createGroupSchema = z.object({
  collegeId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  coverImageUrl: z.string().optional(),
  createdById: z.string(),
  isPrivate: z.boolean().optional().default(false),
  color: z.string().optional(),
});

// POST / — create group and add creator as admin
groupsRouter.post("/", zValidator("json", createGroupSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const inviteCode = await generateUniqueInviteCode();

    const group = await db.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          collegeId: body.collegeId,
          name: body.name,
          description: body.description,
          category: body.category,
          coverImageUrl: body.coverImageUrl,
          createdById: body.createdById,
          inviteCode,
          isPrivate: body.isPrivate ?? false,
          color: body.color,
        },
      });
      // Creator gets admin role
      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId: body.createdById,
          role: "admin",
        },
      });
      return tx.group.findUnique({
        where: { id: newGroup.id },
        include: {
          college: true,
          members: { include: { user: true } },
        },
      });
    });
    return c.json({ group }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to create group" }, 500);
  }
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isPrivate: z.boolean().optional(),
  color: z.string().optional(),
  requesterId: z.string(), // Who is making the update
});

// PUT /:id — update group (requires admin/social_chair)
groupsRouter.put("/:id", zValidator("json", updateGroupSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const { requesterId, ...body } = c.req.valid("json");

    // Authorization check
    if (!await isGroupAdmin(id, requesterId)) {
      return c.json({ error: "Only admins and social chairs can update group" }, 403);
    }

    const group = await db.group.update({
      where: { id },
      data: body,
      include: {
        college: true,
        members: { include: { user: true } },
      },
    });
    return c.json({ group });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to update group" }, 500);
  }
});

const joinSchema = z.object({ userId: z.string() });

// POST /join-by-code — join group using invite code
const joinByCodeSchema = z.object({
  code: z.string().length(6),
  userId: z.string(),
});

groupsRouter.post("/join-by-code", zValidator("json", joinByCodeSchema), async (c) => {
  try {
    const { code, userId } = c.req.valid("json");

    // Find group by invite code (case-insensitive)
    const group = await db.group.findFirst({
      where: { inviteCode: code.toUpperCase() },
      include: { college: true },
    });

    if (!group) {
      return c.json({ error: "Invalid invite code" }, 404);
    }

    // Check if already a member
    const existingMember = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });

    if (existingMember) {
      return c.json({ error: "Already a member of this group", group }, 400);
    }

    // Add as member
    const member = await db.groupMember.create({
      data: { groupId: group.id, userId, role: "member" },
    });

    // Return full group with members
    const fullGroup = await db.group.findUnique({
      where: { id: group.id },
      include: {
        college: true,
        members: { include: { user: true } },
      },
    });

    return c.json({ group: fullGroup, member }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to join group" }, 500);
  }
});

// POST /:id/join — join group as member (only for public groups)
groupsRouter.post("/:id/join", zValidator("json", joinSchema), async (c) => {
  try {
    const groupId = c.req.param("id");
    const { userId } = c.req.valid("json");

    // Check if group exists and if it's private
    const group = await db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    if (group.isPrivate) {
      return c.json({ error: "This group is private. Please request to join." }, 403);
    }

    // Check if already a member
    const existingMember = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      return c.json({ error: "Already a member of this group" }, 400);
    }

    const member = await db.groupMember.create({
      data: { groupId, userId, role: "member" },
    });
    return c.json({ member }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to join group" }, 500);
  }
});

// POST /:id/leave — leave group
groupsRouter.post("/:id/leave", zValidator("json", joinSchema), async (c) => {
  try {
    const groupId = c.req.param("id");
    const { userId } = c.req.valid("json");
    await db.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to leave group" }, 500);
  }
});

const updateRoleSchema = z.object({
  role: z.string(),
  requesterId: z.string(), // Who is making the change
});

// POST /:id/members/:userId/role — update member role (requires admin/social_chair)
groupsRouter.post(
  "/:id/members/:userId/role",
  zValidator("json", updateRoleSchema),
  async (c) => {
    try {
      const groupId = c.req.param("id");
      const userId = c.req.param("userId");
      const { role, requesterId } = c.req.valid("json");

      // Authorization check
      if (!await isGroupAdmin(groupId, requesterId)) {
        return c.json({ error: "Only admins and social chairs can change roles" }, 403);
      }

      const member = await db.groupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { role },
      });
      return c.json({ member });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update member role" }, 500);
    }
  },
);

// DELETE /:id/members/:userId — remove member (requires admin/social_chair, query ?requesterId=)
groupsRouter.delete("/:id/members/:userId", async (c) => {
  try {
    const groupId = c.req.param("id");
    const userId = c.req.param("userId");
    const requesterId = c.req.query("requesterId");

    if (!requesterId) {
      return c.json({ error: "requesterId query param is required" }, 400);
    }

    // Authorization check: admin can remove others, users can remove themselves
    const isSelfRemoval = requesterId === userId;
    if (!isSelfRemoval && !await isGroupAdmin(groupId, requesterId)) {
      return c.json({ error: "Only admins and social chairs can remove members" }, 403);
    }

    await db.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to remove member" }, 500);
  }
});

// GET /:id/join-requests — list pending join requests
groupsRouter.get("/:id/join-requests", async (c) => {
  try {
    const groupId = c.req.param("id");
    const requests = await db.groupJoinRequest.findMany({
      where: { groupId, status: "pending" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ requests });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch join requests" }, 500);
  }
});

// GET /:id/join-requests/my — check if current user has a pending join request
groupsRouter.get("/:id/join-requests/my", async (c) => {
  try {
    const groupId = c.req.param("id");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "userId query param is required" }, 400);
    }

    const request = await db.groupJoinRequest.findFirst({
      where: { groupId, userId, status: "pending" },
    });

    return c.json({ hasPendingRequest: !!request, request });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to check join request" }, 500);
  }
});

const createJoinRequestSchema = z.object({ userId: z.string() });

// POST /:id/join-requests — create join request
groupsRouter.post(
  "/:id/join-requests",
  zValidator("json", createJoinRequestSchema),
  async (c) => {
    try {
      const groupId = c.req.param("id");
      const { userId } = c.req.valid("json");
      const request = await db.groupJoinRequest.create({
        data: { groupId, userId },
        include: { user: true },
      });
      return c.json({ request }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create join request" }, 500);
    }
  },
);

const respondJoinRequestSchema = z.object({
  status: z.enum(["approved", "declined"]),
  decidedById: z.string(), // Who is making the decision
});

// PUT /:id/join-requests/:requestId — approve or decline (requires admin/social_chair)
groupsRouter.put(
  "/:id/join-requests/:requestId",
  zValidator("json", respondJoinRequestSchema),
  async (c) => {
    try {
      const groupId = c.req.param("id");
      const requestId = c.req.param("requestId");
      const { status, decidedById } = c.req.valid("json");

      // Authorization check
      if (!await isGroupAdmin(groupId, decidedById)) {
        return c.json({ error: "Only admins and social chairs can respond to join requests" }, 403);
      }

      const joinRequest = await db.groupJoinRequest.update({
        where: { id: requestId },
        data: { status, decidedAt: new Date() },
      });

      if (status === "approved") {
        await db.groupMember.upsert({
          where: {
            groupId_userId: { groupId, userId: joinRequest.userId },
          },
          create: { groupId, userId: joinRequest.userId, role: "member" },
          update: {},
        });
      }

      return c.json({ request: joinRequest });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to respond to join request" }, 500);
    }
  },
);

export { groupsRouter };

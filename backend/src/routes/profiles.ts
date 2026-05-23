import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const profilesRouter = new Hono();

const upsertProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().optional(),
  gender: z.string().optional(),
  collegeId: z.string().optional(),
  yearInSchool: z.string().optional(),
  drinkingPreference: z.string().optional(),
  personalityIndex: z.number().min(0).max(1).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const updateProfileSchema = upsertProfileSchema.partial().omit({ email: true });

const setInterestsSchema = z.object({
  interestIds: z.array(z.string()),
});

// POST / — create or upsert profile
profilesRouter.post(
  "/",
  zValidator("json", upsertProfileSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");

      // Link to the Better Auth user by email so cascade delete works
      const baUser = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });

      const profile = await db.profile.upsert({
        where: { email: body.email },
        create: {
          email: body.email,
          name: body.name,
          age: body.age,
          gender: body.gender,
          collegeId: body.collegeId,
          yearInSchool: body.yearInSchool,
          drinkingPreference: body.drinkingPreference ?? "flexible",
          personalityIndex: body.personalityIndex ?? 0.5,
          bio: body.bio,
          avatarUrl: body.avatarUrl,
          ...(baUser ? { userId: baUser.id } : {}),
        },
        update: {
          name: body.name,
          age: body.age,
          gender: body.gender,
          collegeId: body.collegeId,
          yearInSchool: body.yearInSchool,
          drinkingPreference: body.drinkingPreference,
          personalityIndex: body.personalityIndex,
          bio: body.bio,
          avatarUrl: body.avatarUrl,
          ...(baUser ? { userId: baUser.id } : {}),
        },
        include: {
          interests: { include: { interest: true } },
          groupMemberships: { include: { group: true } },
          college: true,
        },
      });
      return c.json({ profile }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to upsert profile" }, 500);
    }
  },
);

// GET /by-email/:email — get profile by email
profilesRouter.get("/by-email/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));
    const profile = await db.profile.findUnique({
      where: { email },
      include: {
        interests: { include: { interest: true } },
        groupMemberships: { include: { group: true } },
        college: true,
      },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);
    return c.json({ profile });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// GET /:id — get profile by id (requires requesterId to verify same college)
profilesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const requesterId = c.req.query("requesterId");

    const profile = await db.profile.findUnique({
      where: { id },
      include: {
        interests: { include: { interest: true } },
        groupMemberships: { include: { group: true } },
        college: true,
      },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    // If requesterId provided, verify same college (unless viewing self)
    if (requesterId && requesterId !== id) {
      const requester = await db.profile.findUnique({
        where: { id: requesterId },
        select: { collegeId: true },
      });
      if (requester && requester.collegeId !== profile.collegeId) {
        // Return limited info for cross-college queries
        return c.json({
          profile: {
            id: profile.id,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            college: profile.college,
            // Exclude sensitive fields like bio, interests, groups
          },
        });
      }
    }

    return c.json({ profile });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// PUT /:id — update profile
profilesRouter.put(
  "/:id",
  zValidator("json", updateProfileSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const profile = await db.profile.update({
        where: { id },
        data: body,
        include: {
          interests: { include: { interest: true } },
          groupMemberships: { include: { group: true } },
          college: true,
        },
      });
      return c.json({ profile });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  },
);

// DELETE /:id — permanently delete account (profile + Better Auth user)
profilesRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    // Find the profile to get the email (needed to find the BA user)
    const profile = await db.profile.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    // Delete profile (cascades: interests, groupMemberships, joinRequests,
    // mixerParticipants, feedbacks, stories, reactions, blocks, reports, eduVerifications)
    await db.profile.delete({ where: { id } });

    // Delete the Better Auth user (cascades: sessions, accounts)
    const baUser = await db.user.findUnique({ where: { email: profile.email } });
    if (baUser) {
      // SQLite doesn't enforce FK cascades by default, so delete manually in order
      await db.session.deleteMany({ where: { userId: baUser.id } });
      await db.account.deleteMany({ where: { userId: baUser.id } });
      await db.user.delete({ where: { id: baUser.id } });
    }

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

// POST /:id/interests — replace all interests
profilesRouter.post(
  "/:id/interests",
  zValidator("json", setInterestsSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { interestIds } = c.req.valid("json");

      await db.$transaction(async (tx) => {
        await tx.userInterest.deleteMany({ where: { userId: id } });
        for (const interestId of interestIds) {
          await tx.userInterest.upsert({
            where: { userId_interestId: { userId: id, interestId } },
            create: { userId: id, interestId },
            update: {},
          });
        }
      });

      const profile = await db.profile.findUnique({
        where: { id },
        include: { interests: { include: { interest: true } } },
      });
      if (!profile) return c.json({ error: "Profile not found" }, 404);
      return c.json({ profile });
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to set interests" }, 500);
    }
  },
);

export { profilesRouter };

// GET /search — search for users by name or email (for invites)
profilesRouter.get("/search", async (c) => {
  try {
    const query = c.req.query("q");
    const collegeId = c.req.query("collegeId");
    const excludeGroupId = c.req.query("excludeGroupId");
    const limit = parseInt(c.req.query("limit") || "20", 10);

    if (!query || query.length < 2) {
      return c.json({ profiles: [] });
    }

    // Get existing members of the group to exclude
    let existingMemberIds: string[] = [];
    if (excludeGroupId) {
      const members = await db.groupMember.findMany({
        where: { groupId: excludeGroupId },
        select: { userId: true },
      });
      existingMemberIds = members.map((m) => m.userId);
    }

    const profiles = await db.profile.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          ...(collegeId ? [{ collegeId }] : []),
          ...(existingMemberIds.length > 0
            ? [{ id: { notIn: existingMemberIds } }]
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        yearInSchool: true,
        college: { select: { id: true, name: true } },
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    return c.json({ profiles });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to search profiles" }, 500);
  }
});

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";
import { computeFeatures, computePairingScore } from "../lib/pairing-scorer.js";

const clustersRouter = new Hono();

// PUT /api/mixers/:id/cluster-size — set cluster size for a mixer.
// Requires the caller to be a social_chair/admin of either group.
clustersRouter.put(
  "/:id/cluster-size",
  zValidator("json", z.object({ size: z.number().int().min(2).max(8), requesterId: z.string() })),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { size, requesterId } = c.req.valid("json");

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        include: { groupA: { include: { members: true } }, groupB: { include: { members: true } } },
      });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      const isChair =
        mixer.groupA.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin")) ||
        mixer.groupB.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin"));
      if (!isChair) return c.json({ error: "Only social chairs/admins can change cluster size" }, 403);

      const updated = await db.mixer.update({ where: { id: mixerId }, data: { clusterSize: size } });
      // Clear the irrelevant pairing model so stale data can't surface in the UI.
      if (size >= 3) {
        await db.pairing.deleteMany({ where: { mixerId } });
      } else {
        await db.pairingCluster.deleteMany({ where: { mixerId } });
      }
      return c.json({ mixer: updated });
    } catch (err) {
      console.error("[clusters] cluster-size PUT failed", err);
      return c.json({ error: "Failed to set cluster size" }, 500);
    }
  },
);

// POST /api/mixers/:id/generate-clusters — recompute clusters from current
// participants. Round-robin from each group so every cluster has roughly equal
// representation. Existing clusters for the mixer are wiped.
clustersRouter.post(
  "/:id/generate-clusters",
  zValidator("json", z.object({ requesterId: z.string() })),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { requesterId } = c.req.valid("json");

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        include: {
          groupA: { include: { members: true } },
          groupB: { include: { members: true } },
          participants: true,
          activity: true,
        },
      });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);
      if (mixer.clusterSize < 3) return c.json({ error: "Cluster size must be ≥ 3 to generate clusters" }, 400);

      const isChair =
        mixer.groupA.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin")) ||
        mixer.groupB.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin"));
      if (!isChair) return c.json({ error: "Only social chairs/admins can generate clusters" }, 403);

      const going = mixer.participants.filter((p) => p.rsvpStatus === "going");
      const aIds = going.filter((p) => p.groupId === mixer.groupAId).map((p) => p.userId);
      const bIds = going.filter((p) => p.groupId === mixer.groupBId).map((p) => p.userId);
      const size = mixer.clusterSize;
      const halfA = Math.ceil(size / 2);
      const halfB = size - halfA;
      const useSmart = mixer.pairingMode === "smart";

      // Smart mode: greedy clustering using pairwise compatibility scores.
      // Otherwise: deterministic round-robin (random with stable seed).
      let clusterAssignments: { aIds: string[]; bIds: string[] }[];

      if (useSmart && aIds.length > 0 && bIds.length > 0) {
        // Pull full profiles + interests for scoring.
        const allIds = [...aIds, ...bIds];
        const profiles = await db.profile.findMany({
          where: { id: { in: allIds } },
          include: { interests: { select: { interestId: true } } },
        });
        const profById = new Map(profiles.map((p) => [p.id, p]));

        // Active blocks between participants (so we never cluster blockers).
        const blockRows = await db.block.findMany({
          where: { OR: [
            { blockerId: { in: allIds }, blockedId: { in: allIds } },
          ] },
          select: { blockerId: true, blockedId: true },
        });
        const blocks: [string, string][] = blockRows.map((b) => [b.blockerId, b.blockedId]);

        const score = (aId: string, bId: string): number => {
          const a = profById.get(aId); const b = profById.get(bId);
          if (!a || !b) return 0;
          const features = computeFeatures(a as never, b as never, mixer.activity, blocks);
          const s = computePairingScore(features);
          return s === -Infinity ? -1 : s;
        };

        const remainingA = [...aIds];
        const remainingB = [...bIds];
        const numClusters = Math.max(Math.ceil(aIds.length / halfA), Math.ceil(bIds.length / halfB), 1);
        const out: { aIds: string[]; bIds: string[] }[] = [];

        for (let k = 0; k < numClusters; k++) {
          if (remainingA.length === 0 && remainingB.length === 0) break;
          const cluster: { aIds: string[]; bIds: string[] } = { aIds: [], bIds: [] };

          // Seed: highest-avg-fit A user (anchor).
          if (remainingA.length > 0) {
            let bestIdx = 0;
            let bestAvg = -Infinity;
            for (let i = 0; i < remainingA.length; i++) {
              const aId = remainingA[i]!;
              const avg = remainingB.length === 0 ? 0
                : remainingB.reduce((s, bId) => s + score(aId, bId), 0) / remainingB.length;
              if (avg > bestAvg) { bestAvg = avg; bestIdx = i; }
            }
            cluster.aIds.push(remainingA.splice(bestIdx, 1)[0]!);
          }

          // Fill B side by best compatibility against current cluster anchors.
          for (let i = 0; i < halfB && remainingB.length > 0; i++) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            for (let j = 0; j < remainingB.length; j++) {
              const bId = remainingB[j]!;
              const s = cluster.aIds.reduce((acc, aId) => acc + score(aId, bId), 0);
              if (s > bestScore) { bestScore = s; bestIdx = j; }
            }
            cluster.bIds.push(remainingB.splice(bestIdx, 1)[0]!);
          }

          // Fill remaining A side (additional anchors after seed).
          for (let i = 1; i < halfA && remainingA.length > 0; i++) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            for (let j = 0; j < remainingA.length; j++) {
              const aId = remainingA[j]!;
              const s = cluster.bIds.reduce((acc, bId) => acc + score(aId, bId), 0);
              if (s > bestScore) { bestScore = s; bestIdx = j; }
            }
            cluster.aIds.push(remainingA.splice(bestIdx, 1)[0]!);
          }

          out.push(cluster);
        }
        clusterAssignments = out;
      } else {
        // Stable shuffle round-robin (deterministic — seeded with mixerId).
        const seed = mixerId.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
        const shuffle = <T>(arr: T[]): T[] => {
          const out = [...arr];
          let s = seed;
          for (let i = out.length - 1; i > 0; i--) {
            s = (s * 1664525 + 1013904223) >>> 0;
            const j = s % (i + 1);
            const tmp = out[i]!; out[i] = out[j]!; out[j] = tmp;
          }
          return out;
        };
        const aShuf = shuffle(aIds);
        const bShuf = shuffle(bIds);
        const numClusters = Math.max(Math.ceil(aShuf.length / halfA), Math.ceil(bShuf.length / halfB), 1);
        clusterAssignments = [];
        for (let i = 0; i < numClusters; i++) {
          clusterAssignments.push({
            aIds: aShuf.slice(i * halfA, (i + 1) * halfA),
            bIds: bShuf.slice(i * halfB, (i + 1) * halfB),
          });
        }
      }

      // Wipe existing clusters then persist.
      await db.pairingCluster.deleteMany({ where: { mixerId } });

      const created: { clusterId: string; userIds: string[] }[] = [];
      for (let i = 0; i < clusterAssignments.length; i++) {
        const { aIds: a, bIds: b } = clusterAssignments[i]!;
        const members = [
          ...a.map((uid) => ({ userId: uid, groupId: mixer.groupAId })),
          ...b.map((uid) => ({ userId: uid, groupId: mixer.groupBId })),
        ];
        if (members.length === 0) continue;
        const cluster = await db.pairingCluster.create({
          data: {
            mixerId,
            name: `Cluster ${String.fromCharCode(65 + i)}`,
            members: { create: members },
          },
          include: { members: true },
        });
        created.push({ clusterId: cluster.id, userIds: cluster.members.map((m) => m.userId) });
      }

      return c.json({ clusters: created, mode: useSmart ? "smart" : "random" });
    } catch (err) {
      console.error("[clusters] generate-clusters POST failed", err);
      return c.json({ error: "Failed to generate clusters" }, 500);
    }
  },
);

// GET /api/mixers/:id/clusters — full cluster list with enriched member profiles.
clustersRouter.get("/:id/clusters", async (c) => {
  try {
    const mixerId = c.req.param("id");
    const clusters = await db.pairingCluster.findMany({
      where: { mixerId },
      include: { members: true },
      orderBy: { createdAt: "asc" },
    });
    const allUserIds = clusters.flatMap((cl) => cl.members.map((m) => m.userId));
    const profiles = allUserIds.length > 0
      ? await db.profile.findMany({
          where: { id: { in: Array.from(new Set(allUserIds)) } },
          select: { id: true, name: true, avatarUrl: true },
        })
      : [];
    const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
    return c.json({
      clusters: clusters.map((cl) => ({
        id: cl.id,
        name: cl.name,
        members: cl.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          groupId: m.groupId,
          profile: byId[m.userId] ?? null,
        })),
      })),
    });
  } catch (err) {
    console.error("[clusters] GET /clusters failed", err);
    return c.json({ error: "Failed to fetch clusters" }, 500);
  }
});

// PUT /api/mixers/:id/clusters/move — move a user from their current cluster
// into a different one on the same mixer. Chair-only.
clustersRouter.put(
  "/:id/clusters/move",
  zValidator("json", z.object({
    userId: z.string(),
    targetClusterId: z.string(),
    requesterId: z.string(),
  })),
  async (c) => {
    try {
      const mixerId = c.req.param("id");
      const { userId, targetClusterId, requesterId } = c.req.valid("json");

      const mixer = await db.mixer.findUnique({
        where: { id: mixerId },
        include: { groupA: { include: { members: true } }, groupB: { include: { members: true } } },
      });
      if (!mixer) return c.json({ error: "Mixer not found" }, 404);

      const isChair =
        mixer.groupA.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin")) ||
        mixer.groupB.members.some((m) => m.userId === requesterId && (m.role === "social_chair" || m.role === "admin"));
      if (!isChair) return c.json({ error: "Only social chairs/admins can edit clusters" }, 403);

      const target = await db.pairingCluster.findUnique({ where: { id: targetClusterId } });
      if (!target || target.mixerId !== mixerId) {
        return c.json({ error: "Target cluster not on this mixer" }, 400);
      }

      const existing = await db.pairingClusterMember.findFirst({
        where: { userId, cluster: { mixerId } },
      });
      if (!existing) return c.json({ error: "User isn't currently in any cluster on this mixer" }, 404);
      if (existing.clusterId === targetClusterId) {
        return c.json({ ok: true, unchanged: true });
      }

      await db.pairingClusterMember.update({
        where: { id: existing.id },
        data: { clusterId: targetClusterId },
      });
      return c.json({ ok: true });
    } catch (err) {
      console.error("[clusters] move PUT failed", err);
      return c.json({ error: "Failed to move member" }, 500);
    }
  },
);

// GET /api/mixers/:id/my-cluster?userId=... — return the cluster the user is in
// for this mixer, with enriched member profiles. Or null if not assigned.
clustersRouter.get("/:id/my-cluster", async (c) => {
  try {
    const mixerId = c.req.param("id");
    const userId = c.req.query("userId");
    if (!userId) return c.json({ cluster: null });

    const membership = await db.pairingClusterMember.findFirst({
      where: { userId, cluster: { mixerId } },
      include: {
        cluster: {
          include: {
            members: { include: { cluster: false } },
          },
        },
      },
    });
    if (!membership) return c.json({ cluster: null });

    const profileIds = membership.cluster.members.map((m) => m.userId);
    const profiles = await db.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, name: true, avatarUrl: true, collegeId: true },
    });
    const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

    return c.json({
      cluster: {
        id: membership.cluster.id,
        name: membership.cluster.name,
        members: membership.cluster.members.map((m) => ({
          userId: m.userId,
          groupId: m.groupId,
          profile: profileById[m.userId] ?? null,
        })),
      },
    });
  } catch (err) {
    console.error("[clusters] my-cluster GET failed", err);
    return c.json({ error: "Failed to fetch cluster" }, 500);
  }
});

export { clustersRouter };

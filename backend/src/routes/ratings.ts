import { Hono } from 'hono';
import { db } from '../db';

export const ratingsRouter = new Hono();

const VALID_TAGS = new Set(['fun', 'organized', 'good-energy', 'mix-again']);

// Submit a mixer rating (0-10 scale) with optional tags array.
ratingsRouter.post('/submit', async (c) => {
  const { mixerId, raterId, ratedGroupId, rating, comment, tags } = await c.req.json();

  if (!mixerId || !raterId || !ratedGroupId || rating === undefined) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  const cleanedTags: string[] = Array.isArray(tags)
    ? Array.from(new Set(tags.filter((t: unknown): t is string => typeof t === 'string' && VALID_TAGS.has(t))))
    : [];

  if (rating < 0 || rating > 10) {
    return c.json({ error: 'Rating must be between 0 and 10' }, 400);
  }

  // Verify mixer exists and is completed
  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
    include: {
      participants: true,
    },
  });

  if (!mixer) {
    return c.json({ error: 'Mixer not found' }, 404);
  }

  if (mixer.status !== 'completed') {
    return c.json({ error: 'Can only rate completed mixers' }, 400);
  }

  // Verify rater was a participant
  const isParticipant = mixer.participants.some((p) => p.userId === raterId);
  if (!isParticipant) {
    return c.json({ error: 'Only participants can rate mixers' }, 403);
  }

  // Verify ratedGroup was part of the mixer
  const isRatedGroupInMixer =
    mixer.groupAId === ratedGroupId || mixer.groupBId === ratedGroupId;
  if (!isRatedGroupInMixer) {
    return c.json({ error: 'Rated group was not part of this mixer' }, 400);
  }

  // Upsert rating
  const mixerRating = await db.mixerRating.upsert({
    where: {
      mixerId_raterId_ratedGroupId: {
        mixerId,
        raterId,
        ratedGroupId,
      },
    },
    update: {
      rating,
      comment,
      tags: cleanedTags.join(','),
    },
    create: {
      mixerId,
      raterId,
      ratedGroupId,
      rating,
      comment,
      tags: cleanedTags.join(','),
    },
  });

  // Update mixer average rating
  await updateMixerAvgRating(mixerId);

  // Update group star rating (convert 0-10 to 0-5 stars)
  await updateGroupStarRating(ratedGroupId);

  return c.json({ rating: mixerRating });
});

// Get ratings for a mixer
ratingsRouter.get('/mixer/:mixerId', async (c) => {
  const mixerId = c.req.param('mixerId');

  const ratings = await db.mixerRating.findMany({
    where: { mixerId },
    include: {
      rater: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      ratedGroup: {
        select: {
          id: true,
          name: true,
          coverImageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
    select: {
      avgRating: true,
      totalRatings: true,
    },
  });

  return c.json({
    ratings,
    avgRating: mixer?.avgRating ?? null,
    totalRatings: mixer?.totalRatings ?? 0,
  });
});

// Get a group's star rating
ratingsRouter.get('/group/:groupId', async (c) => {
  const groupId = c.req.param('groupId');

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      avgStarRating: true,
      totalRatings: true,
    },
  });

  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  return c.json({
    groupId: group.id,
    name: group.name,
    starRating: group.avgStarRating,
    totalRatings: group.totalRatings,
  });
});

// Get user's rating for a specific mixer
ratingsRouter.get('/user-rating', async (c) => {
  const mixerId = c.req.query('mixerId');
  const userId = c.req.query('userId');

  if (!mixerId || !userId) {
    return c.json({ error: 'Missing mixerId or userId' }, 400);
  }

  const ratings = await db.mixerRating.findMany({
    where: {
      mixerId,
      raterId: userId,
    },
    include: {
      ratedGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return c.json({ ratings });
});

// Helper: Update mixer's average rating
async function updateMixerAvgRating(mixerId: string): Promise<void> {
  const ratings = await db.mixerRating.findMany({
    where: { mixerId },
  });

  if (ratings.length === 0) return;

  const avgRating = ratings.reduce((sum: number, r) => sum + r.rating, 0) / ratings.length;

  await db.mixer.update({
    where: { id: mixerId },
    data: {
      avgRating,
      totalRatings: ratings.length,
    },
  });
}

// Helper: Update group's star rating (converts 0-10 to 0-5 stars)
async function updateGroupStarRating(groupId: string): Promise<void> {
  const ratings = await db.mixerRating.findMany({
    where: { ratedGroupId: groupId },
  });

  if (ratings.length === 0) return;

  // Convert 0-10 scale to 0-5 stars
  const avgRating10 = ratings.reduce((sum: number, r) => sum + r.rating, 0) / ratings.length;
  const avgStarRating = avgRating10 / 2; // 0-10 → 0-5

  await db.group.update({
    where: { id: groupId },
    data: {
      avgStarRating,
      totalRatings: ratings.length,
    },
  });
}

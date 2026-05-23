import { Hono } from 'hono';
import { db } from '../db';

export const recapsRouter = new Hono();

// Get mixer recap (available for 24h after completion)
recapsRouter.get('/:mixerId', async (c) => {
  const mixerId = c.req.param('mixerId');

  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
    include: {
      groupA: {
        select: {
          id: true,
          name: true,
          coverImageUrl: true,
          avgStarRating: true,
        },
      },
      groupB: {
        select: {
          id: true,
          name: true,
          coverImageUrl: true,
          avgStarRating: true,
        },
      },
      activity: {
        select: {
          id: true,
          name: true,
          category: true,
          energyLevel: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      mixerStories: {
        where: { isDeleted: false },
        select: {
          id: true,
          storagePath: true,
          mediaType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 10, // Top 10 stories for recap
      },
      mixerRatings: {
        select: {
          rating: true,
          ratedGroupId: true,
        },
      },
    },
  });

  if (!mixer) {
    return c.json({ error: 'Mixer not found' }, 404);
  }

  if (mixer.status !== 'completed') {
    return c.json({ error: 'Recap only available for completed mixers' }, 400);
  }

  // Check if recap has expired (24h after completion)
  const now = new Date();
  const recapExpiresAt = mixer.recapExpiresAt
    ? new Date(mixer.recapExpiresAt)
    : mixer.completedAt
    ? new Date(new Date(mixer.completedAt).getTime() + 24 * 60 * 60 * 1000)
    : null;

  if (recapExpiresAt && now > recapExpiresAt) {
    return c.json({ error: 'Recap has expired', expired: true }, 410);
  }

  // Calculate group ratings from mixer
  const groupARatings = mixer.mixerRatings.filter((r) => r.ratedGroupId === mixer.groupAId);
  const groupBRatings = mixer.mixerRatings.filter((r) => r.ratedGroupId === mixer.groupBId);

  const groupAAvgRating =
    groupARatings.length > 0
      ? groupARatings.reduce((sum, r) => sum + r.rating, 0) / groupARatings.length
      : null;
  const groupBAvgRating =
    groupBRatings.length > 0
      ? groupBRatings.reduce((sum, r) => sum + r.rating, 0) / groupBRatings.length
      : null;

  // Group participants by group
  const groupAParticipants = mixer.participants.filter((p) => p.groupId === mixer.groupAId);
  const groupBParticipants = mixer.participants.filter((p) => p.groupId === mixer.groupBId);

  return c.json({
    recap: {
      mixerId: mixer.id,
      completedAt: mixer.completedAt,
      recapExpiresAt,
      location: mixer.location,
      activity: mixer.activity,
      groupA: {
        ...mixer.groupA,
        participantCount: groupAParticipants.length,
        participants: groupAParticipants.map((p) => p.user),
        mixerRating: groupAAvgRating,
      },
      groupB: {
        ...mixer.groupB,
        participantCount: groupBParticipants.length,
        participants: groupBParticipants.map((p) => p.user),
        mixerRating: groupBAvgRating,
      },
      overallRating: mixer.avgRating,
      totalRatings: mixer.totalRatings,
      storyCount: mixer.mixerStories.length,
      topStories: mixer.mixerStories,
    },
  });
});

// Get all available recaps for a user (completed mixers within 24h)
recapsRouter.get('/available/:userId', async (c) => {
  const userId = c.req.param('userId');
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find mixers where user was a participant, completed in last 24h
  const participations = await db.mixerParticipant.findMany({
    where: { userId },
    include: {
      mixer: {
        include: {
          groupA: {
            select: {
              id: true,
              name: true,
              coverImageUrl: true,
            },
          },
          groupB: {
            select: {
              id: true,
              name: true,
              coverImageUrl: true,
            },
          },
          activity: {
            select: {
              id: true,
              name: true,
            },
          },
          mixerRatings: {
            select: { rating: true, ratedGroupId: true, raterId: true },
          },
          _count: {
            select: {
              mixerStories: true,
              mixerRatings: true,
            },
          },
        },
      },
    },
  });

  // Filter to completed mixers with valid recaps
  const availableRecaps = participations
    .filter((p) => {
      const mixer = p.mixer;
      if (mixer.status !== 'completed') return false;
      if (!mixer.completedAt) return false;

      const completedAt = new Date(mixer.completedAt);
      const expiresAt = mixer.recapExpiresAt
        ? new Date(mixer.recapExpiresAt)
        : new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);

      return now < expiresAt && completedAt > twentyFourHoursAgo;
    })
    .map((p) => {
      const mixer = p.mixer;
      // The user's own rating and which group they rated
      const myRatingEntry = mixer.mixerRatings.find((r) => r.raterId === userId);
      const myRating = myRatingEntry?.rating ?? null;
      const ratedGroupId = myRatingEntry?.ratedGroupId ?? null;

      // Average rating for just the group the current user rated (the other group)
      let otherGroupAvgRating: number | null = null;
      if (ratedGroupId) {
        const groupRatings = mixer.mixerRatings.filter((r) => r.ratedGroupId === ratedGroupId);
        if (groupRatings.length > 0) {
          otherGroupAvgRating = groupRatings.reduce((sum, r) => sum + r.rating, 0) / groupRatings.length;
        }
      }

      return {
        mixerId: mixer.id,
        completedAt: mixer.completedAt,
        recapExpiresAt:
          mixer.recapExpiresAt ||
          new Date(new Date(mixer.completedAt!).getTime() + 24 * 60 * 60 * 1000),
        location: mixer.location,
        groupA: mixer.groupA,
        groupB: mixer.groupB,
        activity: mixer.activity,
        storyCount: mixer._count.mixerStories,
        ratingCount: mixer._count.mixerRatings,
        avgRating: otherGroupAvgRating,
        myRating,
      };
    });

  return c.json({ recaps: availableRecaps });
});

// Set mixer recap expiration (called when mixer completes)
recapsRouter.post('/set-expiration/:mixerId', async (c) => {
  const mixerId = c.req.param('mixerId');

  const mixer = await db.mixer.findUnique({
    where: { id: mixerId },
  });

  if (!mixer) {
    return c.json({ error: 'Mixer not found' }, 404);
  }

  if (mixer.status !== 'completed') {
    return c.json({ error: 'Mixer must be completed' }, 400);
  }

  const completedAt = mixer.completedAt || new Date();
  const recapExpiresAt = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);

  await db.mixer.update({
    where: { id: mixerId },
    data: { recapExpiresAt },
  });

  return c.json({ success: true, recapExpiresAt });
});

import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { MixerRatingModal } from '@/components/MixerRatingModal';

const DISMISSED_KEY = 'mixer-rating-dismissed-v1';
const POST_END_DELAY_MS = 30 * 60 * 1000;

// On app open, finds the user's most recent unrated completed mixer (≥30 min
// after end time) and surfaces the rating modal. Per-mixer dismissal stored in
// AsyncStorage so we only prompt once even if the user closes it.
export function MixerRatingGate() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      if (raw) {
        try { setDismissed(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    });
  }, []);

  const { data: availableRecaps = [] } = useQuery({
    queryKey: ['available-recaps', profile?.id],
    queryFn: () => api.recaps.getAvailable(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 5 * 60_000,
  });

  // Pick the most-recently-completed mixer that:
  // - finished at least 30 min ago
  // - user hasn't dismissed
  // - user hasn't rated yet (we'll filter via the user-rating query below)
  const candidate = useMemo(() => {
    const now = Date.now();
    return availableRecaps
      .filter((r) => now - new Date(r.completedAt).getTime() >= POST_END_DELAY_MS)
      .filter((r) => !dismissed.has(r.mixerId))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  }, [availableRecaps, dismissed]);

  // Has the user already rated this mixer?
  const { data: existingRatings = [] } = useQuery({
    queryKey: ['my-rating', candidate?.mixerId, profile?.id],
    queryFn: () => api.ratings.getUserRating(candidate!.mixerId, profile!.id),
    enabled: !!candidate?.mixerId && !!profile?.id,
  });

  const visible = !!candidate && existingRatings.length === 0;

  // Which group should the user rate? — the opposing group.
  // We need the mixer to know which group the user belongs to. Pull it.
  const { data: mixer } = useQuery({
    queryKey: ['mixer-for-rating', candidate?.mixerId, profile?.id],
    queryFn: () => api.mixers.get(candidate!.mixerId, profile?.id),
    enabled: visible,
  });

  if (!visible || !candidate || !mixer || !profile) return null;

  const myGroupId =
    mixer.groupA?.members?.some((m) => m.userId === profile.id) ? mixer.groupAId
    : mixer.groupB?.members?.some((m) => m.userId === profile.id) ? mixer.groupBId
    : null;
  const rateGroupId = myGroupId === mixer.groupAId ? mixer.groupBId : mixer.groupAId;
  const rateGroupName = rateGroupId === mixer.groupAId
    ? (mixer.groupA?.name ?? 'Group A')
    : (mixer.groupB?.name ?? 'Group B');

  const handleClose = async () => {
    if (!candidate) return;
    const next = new Set(dismissed);
    next.add(candidate.mixerId);
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
  };

  const handleSubmit = async (rating: number, comment?: string, tags?: string[]) => {
    if (!candidate || !rateGroupId) return;
    setIsSubmitting(true);
    try {
      await api.ratings.submit({
        mixerId: candidate.mixerId,
        raterId: profile.id,
        ratedGroupId: rateGroupId,
        rating,
        comment,
        tags,
      });
      queryClient.invalidateQueries({ queryKey: ['available-recaps'] });
      queryClient.invalidateQueries({ queryKey: ['my-rating'] });
      await handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MixerRatingModal
      visible
      onClose={handleClose}
      onSubmit={handleSubmit}
      groupName={rateGroupName}
      isSubmitting={isSubmitting}
    />
  );
}

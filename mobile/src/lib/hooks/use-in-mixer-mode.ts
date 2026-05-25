import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import type { Mixer } from '@/lib/types';

// Mixer time window helpers (mirrors MixerArrivalGate).
const FALLBACK_DURATION_MS = 4 * 60 * 60 * 1000;
const END_BUFFER_MS = 30 * 60 * 1000;

function isInWindow(m: Mixer, now: number): boolean {
  const startSrc = m.liveStartedAt ?? m.scheduledStart;
  const start = startSrc ? new Date(startSrc).getTime() : null;
  if (!start || now < start) return false;
  const endTs = m.scheduledEnd
    ? new Date(m.scheduledEnd).getTime() + END_BUFFER_MS
    : start + FALLBACK_DURATION_MS;
  return now <= endTs;
}

// Returns the user's currently-active mixer (in time window) or null. Re-evaluates
// every 60 seconds and re-fetches mixers in the background.
export function useInMixerMode(): Mixer | null {
  const profile = useAuthStore((s) => s.profile);
  const myGroupIds = useMemo(
    () => profile?.groupMemberships?.map((m) => m.groupId) ?? [],
    [profile?.groupMemberships],
  );

  const { data: mixers = [] } = useQuery<Mixer[]>({
    queryKey: ['in-mixer-mode-mixers', myGroupIds.join(',')],
    queryFn: async () => {
      if (myGroupIds.length === 0) return [];
      const results = await Promise.all(myGroupIds.map((gid) => api.mixers.list({ groupId: gid })));
      const seen = new Set<string>();
      return results.flat().filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    enabled: !!profile && myGroupIds.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    return (
      mixers.find(
        (m) =>
          (m.status === 'live' || m.status === 'locked' || m.status === 'upcoming') &&
          isInWindow(m, now),
      ) ?? null
    );
  }, [mixers]);
}

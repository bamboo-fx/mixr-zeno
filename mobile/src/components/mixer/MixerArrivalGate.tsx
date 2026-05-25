import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import type { Mixer } from '@/lib/types';
import { LiveActivationModal } from '@/components/mixer/LiveActivationModal';

const DISMISSED_KEY = 'mixer-arrival-dismissed-v1';
// Window: from scheduledStart (or liveStartedAt) through scheduledEnd + 30min.
// If no scheduledEnd, default to 4h after start.
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

// Mounts inside the authenticated app shell. If the user has an active mixer
// in its time window that they haven't dismissed yet, full-screen pop-up auto-opens.
export function MixerArrivalGate() {
  const profile = useAuthStore((s) => s.profile);
  const myGroupIds = useMemo(
    () => profile?.groupMemberships?.map((m) => m.groupId) ?? [],
    [profile?.groupMemberships],
  );

  // Fetch mixers for all my groups, dedupe.
  const { data: mixers = [] } = useQuery<Mixer[]>({
    queryKey: ['arrival-gate-mixers', myGroupIds.join(',')],
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
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      if (raw) {
        try { setDismissed(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    });
  }, []);

  // Tick once a minute so the window-check re-evaluates as time passes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => {
    const now = Date.now();
    return mixers.find(
      (m) =>
        (m.status === 'live' || m.status === 'locked' || m.status === 'upcoming') &&
        isInWindow(m, now) &&
        !dismissed.has(m.id),
    );
  }, [mixers, dismissed]);

  // Pull the full mixer (participants/pairings) once we have a target.
  const { data: fullMixer } = useQuery<Mixer>({
    queryKey: ['mixer', target?.id, profile?.id],
    queryFn: () => api.mixers.get(target!.id, profile?.id),
    enabled: !!target?.id,
  });

  const handleDismiss = async () => {
    if (!target) return;
    const next = new Set(dismissed);
    next.add(target.id);
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
  };

  if (!target || !fullMixer || !profile) return null;

  return (
    <LiveActivationModal
      visible
      mixer={fullMixer}
      profileId={profile.id}
      myProfile={profile}
      onDismiss={handleDismiss}
    />
  );
}

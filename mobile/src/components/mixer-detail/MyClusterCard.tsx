import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors as C, fonts as F } from '@/lib/theme';

type Props = {
  mixerId: string;
  userId: string | undefined;
  homeGroupId: string;
  awayGroupId: string;
};

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

// Shows the user's cluster on a sub-cluster (3+) mixer. Hidden if there's no
// cluster yet (chair hasn't generated, or user isn't assigned).
export function MyClusterCard({ mixerId, userId, homeGroupId, awayGroupId }: Props) {
  const { data: cluster, isLoading } = useQuery({
    queryKey: ['my-cluster', mixerId, userId],
    queryFn: () => api.clusters.myCluster(mixerId, userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.card}><ActivityIndicator color={C.ink2} /></View>
      </View>
    );
  }
  if (!cluster) return null;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title}>Your cluster</Text>
        {cluster.name && <Text style={styles.meta}>{cluster.name}</Text>}
      </View>
      <View style={styles.card}>
        {cluster.members.map((m, idx) => {
          const accent = m.groupId === homeGroupId ? C.navy : m.groupId === awayGroupId ? C.crimson : C.ink2;
          return (
            <View key={m.userId} style={[styles.row, idx > 0 && styles.rowBorder]}>
              <View style={[styles.avatar, { backgroundColor: accent + '33', borderColor: accent + '88' }]}>
                <Text style={[styles.avatarText, { color: accent }]}>{initials(m.profile?.name)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.name}>{m.profile?.name ?? 'Unknown'}</Text>
                <Text numberOfLines={1} style={[styles.sub, { color: accent }]}>
                  {m.groupId === homeGroupId ? 'Home group' : m.groupId === awayGroupId ? 'Away group' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 4, marginTop: 24 },
  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 12, paddingHorizontal: 4,
  },
  title: { color: C.ink, fontFamily: F.bold, fontSize: 22, letterSpacing: -0.55 },
  meta: { color: C.ink3, fontFamily: F.medium, fontSize: 12 },
  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairline },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontFamily: F.bold, fontSize: 15, letterSpacing: -0.2 },
  name: { color: C.ink, fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, marginBottom: 2 },
  sub: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
});

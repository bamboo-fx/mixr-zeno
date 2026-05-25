import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as C, fonts as F } from '@/lib/theme';

type GroupSide = {
  name: string;
  college: string;
  abbreviation: string;   // 2-3 letters for crest, e.g. "PO" / "LS"
  goingCount: number;
  role: 'Hosting' | 'Joining';
};

type Props = {
  totalConfirmed: number;
  home: GroupSide;
  away: GroupSide;
};

function abbreviate(name: string): string {
  // Use first two initials of words, uppercase. Fallback to first two letters.
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (name.slice(0, 2)).toUpperCase();
}

export { abbreviate };

export function RosterCard({ totalConfirmed, home, away }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Who's going</Text>
        <Text style={styles.sectionMeta}>
          <Text style={styles.metaNum}>{totalConfirmed}</Text>
          <Text style={styles.metaSep}> confirmed</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Row side={home} accent={C.navy} accentGradient={['#4F7CFF', '#1E3FB8']} isFirst />
        <Row side={away} accent={C.crimson} accentGradient={['#FF4D5E', '#B61E32']} />
      </View>
    </View>
  );
}

function Row({
  side,
  accent,
  accentGradient,
  isFirst,
}: {
  side: GroupSide;
  accent: string;
  accentGradient: [string, string];
  isFirst?: boolean;
}) {
  return (
    <View style={[styles.row, !isFirst && styles.rowBorder]}>
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <LinearGradient
        colors={accentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.crest,
          {
            shadowColor: accent,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          },
        ]}
      >
        <Text style={styles.crestText}>{side.abbreviation}</Text>
      </LinearGradient>

      <View style={styles.middle}>
        <Text style={styles.rowName} numberOfLines={1}>{side.name}</Text>
        <View style={styles.subRow}>
          <Text style={styles.rowSub} numberOfLines={1}>{side.college}</Text>
          <View style={[styles.tag, { backgroundColor: accent + '24' }]}>
            <Text style={[styles.tagText, { color: accent }]}>{side.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.num, { color: accent }]}>{side.goingCount}</Text>
        <Text style={[styles.label, { color: accent }]}>going</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 4,
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: F.bold,
    color: C.ink,
    fontSize: 22,
    letterSpacing: -0.55,
  },
  sectionMeta: {
    fontFamily: F.medium,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  metaNum: {
    fontFamily: F.bold,
    color: C.amber,
    fontVariant: ['tabular-nums'],
  },
  metaSep: {
    color: C.ink,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
    overflow: 'hidden',
  },

  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },

  stripe: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 3,
  },

  crest: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestText: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },

  middle: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: C.ink,
    fontFamily: F.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowSub: {
    color: C.ink3,
    fontFamily: F.medium,
    fontSize: 12,
    letterSpacing: -0.05,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: F.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  right: {
    alignItems: 'flex-end',
  },
  num: {
    fontFamily: F.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});

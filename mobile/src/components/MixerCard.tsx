import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { StatusBadge, MixerStatus } from '@/components/StatusBadge';
import { colors as C, fonts as F } from '@/lib/theme';

interface MixerCardProps {
  groupA: string;
  groupB: string;
  location: string;
  start: Date;
  end?: Date;
  status: MixerStatus;
  activityName: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  let timeStr: string;
  if (days > 0) {
    timeStr = `${days}d`;
  } else if (hours > 0) {
    timeStr = `${hours}h`;
  } else if (minutes > 0) {
    timeStr = `${minutes}m`;
  } else {
    return 'now';
  }

  return isPast ? `${timeStr} ago` : `in ${timeStr}`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function MixerCard({
  groupA,
  groupB,
  location,
  start,
  end,
  status,
  activityName,
}: MixerCardProps) {
  const timeLabel = status === 'live'
    ? end
      ? `${formatClock(start)} – ${formatClock(end)}`
      : `Started ${formatClock(start)}`
    : formatRelativeTime(start);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>
            <Text style={styles.titleHome}>{groupA}</Text>
            <Text style={styles.titleX}>  ×  </Text>
            <Text style={styles.titleAway}>{groupB}</Text>
          </Text>
          <Text style={styles.activity}>{activityName}</Text>
        </View>
        <StatusBadge status={status} />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.time, status === 'live' && { color: C.mint }]}>{timeLabel}</Text>
        <View style={styles.locationRow}>
          <MapPin size={13} color={C.ink3} />
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: F.bold,
    color: C.ink,
    letterSpacing: -0.3,
  },
  titleHome: { color: C.navy, fontFamily: F.bold },
  titleAway: { color: C.crimson, fontFamily: F.bold },
  titleX:    { color: 'rgba(255,255,255,0.5)', fontFamily: F.regular },
  activity: {
    fontSize: 13,
    fontFamily: F.medium,
    color: C.ink2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  time: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: C.ink2,
    letterSpacing: -0.1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
  },
  location: {
    fontSize: 13,
    fontFamily: F.medium,
    color: C.ink2,
  },
});

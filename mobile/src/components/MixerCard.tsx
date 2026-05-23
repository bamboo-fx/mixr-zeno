import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { StatusBadge, MixerStatus } from '@/components/StatusBadge';
import { DS } from '@/lib/ds';

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
    <GlassCard>
      <View style={styles.container}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>
              {groupA} × {groupB}
            </Text>
            <Text style={styles.activity}>{activityName}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        {/* Footer row */}
        <View style={styles.footerRow}>
          <Text style={[styles.time, status === 'live' && { color: '#22C55E' }]}>{timeLabel}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={DS.Color.text3} />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerContent: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
  },
  activity: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  location: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text2,
  },
});

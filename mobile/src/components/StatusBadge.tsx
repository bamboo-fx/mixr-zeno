import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Calendar, Lock, CheckCircle2, XCircle } from 'lucide-react-native';

export type MixerStatus = 'upcoming' | 'locked' | 'live' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: MixerStatus;
}

const STATUS_ICONS: Partial<Record<MixerStatus, typeof Calendar>> = {
  upcoming: Calendar,
  locked: Lock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_STYLES: Record<
  MixerStatus,
  { bg: string; border: string; text: string; icon: string }
> = {
  upcoming: {
    bg: '#1A1A1A',
    border: 'rgba(255, 255, 255, 0.10)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  locked: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.30)',
    text: '#F59E0B',
    icon: '#F59E0B',
  },
  live: {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
    text: '#22C55E',
    icon: '#22C55E',
  },
  completed: {
    bg: '#1A1A1A',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#606060',
    icon: '#606060',
  },
  cancelled: {
    bg: '#1A1A1A',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#606060',
    icon: '#606060',
  },
};

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.9, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulse, opacity]);

  return (
    <View style={styles.dotContainer}>
      {/* Ripple ring */}
      <Animated.View
        style={[
          styles.dotRipple,
          { transform: [{ scale: pulse }], opacity },
        ]}
      />
      {/* Solid core */}
      <View style={styles.dotCore} />
    </View>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const theme = STATUS_STYLES[status];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
        },
      ]}
    >
      {status === 'live' ? (
        <LiveDot />
      ) : Icon ? (
        <Icon size={10} color={theme.icon} strokeWidth={2.5} />
      ) : null}
      <Text style={[styles.badgeText, { color: theme.text }]}>
        {status === 'live' ? 'LIVE' : status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 0.8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dotContainer: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRipple: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
});

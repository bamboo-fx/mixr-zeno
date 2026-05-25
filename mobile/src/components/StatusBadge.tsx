import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Calendar, Lock, CheckCircle2, XCircle } from 'lucide-react-native';
import { colors as C, fonts as F } from '@/lib/theme';

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
    bg: C.surface2,
    border: C.hairline,
    text: C.ink,
    icon: C.ink,
  },
  locked: {
    bg: 'rgba(255,181,71,0.14)',
    border: 'rgba(255,181,71,0.30)',
    text: C.amber,
    icon: C.amber,
  },
  live: {
    bg: 'rgba(58,227,160,0.14)',
    border: 'rgba(58,227,160,0.35)',
    text: C.mint,
    icon: C.mint,
  },
  completed: {
    bg: C.surface2,
    border: C.hairline,
    text: C.ink3,
    icon: C.ink3,
  },
  cancelled: {
    bg: C.surface2,
    border: C.hairline,
    text: C.ink3,
    icon: C.ink3,
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
    fontFamily: F.bold,
    letterSpacing: 0.4,
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
    backgroundColor: C.mint,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.mint,
  },
});

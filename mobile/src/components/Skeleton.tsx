import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';

interface SkeletonProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  height = 16,
  width = '100%',
  borderRadius = 10,
  style,
}: SkeletonProps) {
  const translateX = useSharedValue(-220);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(220, {
        duration: 1150,
        easing: Easing.linear,
      }),
      -1, // infinite
      false // no reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          height,
          width: width as any,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.05)',
            'rgba(255, 255, 255, 0.16)',
            'rgba(255, 255, 255, 0.05)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

// Pre-built skeleton variants for common use cases
export function SkeletonText({ lines = 1 }: { lines?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <Skeleton height={size} width={size} borderRadius={size / 2} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <SkeletonAvatar size={64} />
        <View style={styles.cardContent}>
          <Skeleton height={18} width="60%" />
          <Skeleton height={14} width="40%" />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  gradient: {
    flex: 1,
  },
  card: {
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.lg,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
    padding: DS.Spacing.lg,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: DS.Spacing.md,
  },
  cardContent: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
});

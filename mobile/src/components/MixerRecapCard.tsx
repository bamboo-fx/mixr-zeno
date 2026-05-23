import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Camera, Clock, Star, ChevronRight } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { AvailableRecap } from '@/lib/types';

interface MixerRecapCardProps {
  recap: AvailableRecap;
  onPress: () => void;
  canRate?: boolean;
}

export function MixerRecapCard({ recap, onPress, canRate = false }: MixerRecapCardProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.medium();
    onPress();
  };

  const expiresAt = new Date(recap.recapExpiresAt);
  const now = new Date();
  const hoursRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor(((expiresAt.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Timer badge */}
          <Animated.View style={[styles.timeBadge, pulseStyle]}>
            <Clock size={12} color="#EC4899" />
            <Text style={styles.timeText}>{hoursRemaining}h {minutesRemaining}m left</Text>
          </Animated.View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {recap.groupA.name} × {recap.groupB.name}
            </Text>
            {recap.activity && (
              <Text style={styles.activityName} numberOfLines={1}>{recap.activity.name}</Text>
            )}
            <View style={styles.statsRow}>
              {recap.storyCount > 0 && (
                <View style={styles.statItem}>
                  <Camera size={14} color={DS.Color.text2} />
                  <Text style={styles.statText}>{recap.storyCount} stories</Text>
                </View>
              )}
              {recap.avgRating !== null && (
                <View style={styles.statItem}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.statText}>{Math.round(recap.avgRating / 2)}/5</Text>
                </View>
              )}
            </View>
            {recap.myRating !== null ? (
              <View style={styles.myRatingRow}>
                <Star size={12} color={DS.Color.gelPurple} fill={DS.Color.gelPurple} />
                <Text style={styles.myRatingText}>You rated {Math.round(recap.myRating / 2)}/5</Text>
              </View>
            ) : canRate ? (
              <Text style={styles.rateNudge}>★ Rate Now</Text>
            ) : null}
          </View>

          <View style={styles.arrowContainer}>
            <ChevronRight size={20} color={DS.Color.text2} />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: DS.Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: DS.Spacing.md,
    gap: DS.Spacing.md,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EC4899',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
  },
  activityName: {
    fontSize: 13,
    color: DS.Color.text2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: DS.Spacing.md,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: DS.Color.text2,
  },
  rateNudge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 2,
  },
  myRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  myRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.Color.gelPurple,
  },
  arrowContainer: {
    padding: 4,
  },
});

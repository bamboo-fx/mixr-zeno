import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { DS } from '@/lib/ds';

interface GroupStarRatingProps {
  rating: number | null; // 0-5 scale
  totalRatings: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  animated?: boolean;
}

const SIZES = {
  sm: { starSize: 12, gap: 2, fontSize: 11 },
  md: { starSize: 16, gap: 3, fontSize: 13 },
  lg: { starSize: 24, gap: 4, fontSize: 16 },
};

// Individual star component to properly use hooks
function AnimatedStar({
  index,
  rating,
  starSize,
  animated,
}: {
  index: number;
  rating: number | null;
  starSize: number;
  animated: boolean;
}) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (animated && rating !== null) {
      scale.value = withDelay(
        index * 100,
        withSequence(
          withTiming(1.3, { duration: 150 }),
          withTiming(1, { duration: 150 })
        )
      );
    }
  }, [rating, animated, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillAmount = rating !== null ? Math.max(0, Math.min(1, rating - index)) : 0;
  const isFilled = fillAmount >= 1;
  const isPartial = fillAmount > 0 && fillAmount < 1;

  return (
    <Animated.View style={animatedStyle}>
      <View style={{ width: starSize, height: starSize }}>
        {/* Background star (empty) */}
        <Star
          size={starSize}
          color={DS.Color.stroke}
          style={StyleSheet.absoluteFill}
        />

        {/* Filled portion */}
        {(isFilled || isPartial) && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                width: isPartial ? `${fillAmount * 100}%` : '100%',
                overflow: 'hidden',
              },
            ]}
          >
            <Star size={starSize} color="#FBBF24" fill="#FBBF24" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function GroupStarRating({
  rating,
  totalRatings,
  size = 'md',
  showCount = true,
  animated = false,
}: GroupStarRatingProps) {
  const { starSize, gap, fontSize } = SIZES[size];

  if (rating === null && totalRatings === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.starsContainer, { gap }]}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} size={starSize} color={DS.Color.stroke} />
          ))}
        </View>
        {showCount && (
          <Text style={[styles.countText, { fontSize }]}>No ratings yet</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.starsContainer, { gap }]}>
        {[0, 1, 2, 3, 4].map((index) => (
          <AnimatedStar
            key={index}
            index={index}
            rating={rating}
            starSize={starSize}
            animated={animated}
          />
        ))}
      </View>

      {showCount && (
        <Text style={[styles.countText, { fontSize }]}>
          {rating !== null ? rating.toFixed(1) : '—'}{' '}
          <Text style={styles.countSubtext}>
            ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
          </Text>
        </Text>
      )}
    </View>
  );
}

// Compact variant for inline display
interface CompactStarRatingProps {
  rating: number | null;
  size?: number;
}

export function CompactStarRating({ rating, size = 14 }: CompactStarRatingProps) {
  if (rating === null) {
    return (
      <View style={styles.compactContainer}>
        <Star size={size} color={DS.Color.stroke} />
        <Text style={[styles.compactText, { fontSize: size - 2 }]}>—</Text>
      </View>
    );
  }

  return (
    <View style={styles.compactContainer}>
      <Star size={size} color="#FBBF24" fill="#FBBF24" />
      <Text style={[styles.compactText, { fontSize: size - 2 }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontWeight: '600',
    color: DS.Color.text,
  },
  countSubtext: {
    fontWeight: '400',
    color: DS.Color.text2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactText: {
    fontWeight: '600',
    color: DS.Color.text,
  },
});

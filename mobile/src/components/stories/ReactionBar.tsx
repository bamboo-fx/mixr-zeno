import React, { useCallback, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { ReactionType, ReactionSummary } from '@/lib/api';

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'fire', emoji: '🔥' },
  { type: 'party', emoji: '🎉' },
  { type: 'love', emoji: '🫶' },
];

interface ReactionBarProps {
  storyId: string;
  summary: ReactionSummary | null;
  onReact: (storyId: string, reaction: ReactionType) => Promise<void>;
  disabled?: boolean;
}

export function ReactionBar({ storyId, summary, onReact, disabled = false }: ReactionBarProps) {
  const [isLoading, setIsLoading] = useState<ReactionType | null>(null);

  const handleReact = useCallback(
    async (reaction: ReactionType) => {
      if (disabled || isLoading) return;

      Haptics.medium();
      setIsLoading(reaction);
      try {
        await onReact(storyId, reaction);
      } finally {
        setIsLoading(null);
      }
    },
    [storyId, onReact, disabled, isLoading]
  );

  return (
    <View style={styles.container}>
      {REACTIONS.map((r) => (
        <ReactionButton
          key={r.type}
          type={r.type}
          emoji={r.emoji}
          count={summary?.counts[r.type] ?? 0}
          isSelected={summary?.userReactions.includes(r.type) ?? false}
          isLoading={isLoading === r.type}
          onPress={() => handleReact(r.type)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

interface ReactionButtonProps {
  type: ReactionType;
  emoji: string;
  count: number;
  isSelected: boolean;
  isLoading: boolean;
  onPress: () => void;
  disabled: boolean;
}

function ReactionButton({
  emoji,
  count,
  isSelected,
  isLoading,
  onPress,
  disabled,
}: ReactionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    // Pop animation
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    onPress();
  }, [scale, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.reactionButton,
          isSelected && styles.reactionButtonSelected,
          animatedStyle,
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        {count > 0 && (
          <Text style={[styles.count, isSelected && styles.countSelected]}>
            {count}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.md,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  countSelected: {
    color: DS.Color.text,
  },
});

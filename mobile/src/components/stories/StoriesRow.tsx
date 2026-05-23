import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
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
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type StoryFeedItem } from '@/lib/api';

const BUBBLE_SIZE = 68;
const RING_SIZE = BUBBLE_SIZE + 6;

interface StoriesRowProps {
  feed: StoryFeedItem[];
  onStoryPress: (mixerId: string, stories: StoryFeedItem) => void;
  seenMixerIds?: Set<string>;
}

export function StoriesRow({ feed, onStoryPress, seenMixerIds = new Set() }: StoriesRowProps) {
  if (feed.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {feed.map((item) => (
        <StoryBubble
          key={item.mixerId}
          item={item}
          isSeen={seenMixerIds.has(item.mixerId)}
          onPress={() => onStoryPress(item.mixerId, item)}
        />
      ))}
    </ScrollView>
  );
}

interface StoryBubbleProps {
  item: StoryFeedItem;
  isSeen: boolean;
  onPress: () => void;
}

function StoryBubble({ item, isSeen, onPress }: StoryBubbleProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(isSeen ? 0 : 0.6);

  // Subtle glow animation for unseen stories
  React.useEffect(() => {
    if (!isSeen) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = 0;
    }
  }, [isSeen, glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.tap();
    onPress();
  }, [onPress]);

  const thumbnailUrl = api.stories.getFileUrl(item.thumbnailPath);
  const label = `${item.groupAName.slice(0, 8)} × ${item.groupBName.slice(0, 8)}`;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.bubbleContainer}
    >
      <Animated.View style={animatedStyle}>
        {/* Glow effect for unseen */}
        {!isSeen && (
          <Animated.View style={[styles.glow, glowStyle]}>
            <LinearGradient
              colors={DS.Grad.accent.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glowGradient}
            />
          </Animated.View>
        )}

        {/* Ring */}
        <View style={styles.ringContainer}>
          {isSeen ? (
            <View style={[styles.ring, styles.ringGray]} />
          ) : (
            <LinearGradient
              colors={DS.Grad.accent.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ring}
            />
          )}

          {/* Inner bubble with image */}
          <View style={styles.innerBubble}>
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Story count badge */}
        {item.storyCount > 1 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{item.storyCount}</Text>
          </View>
        )}
      </Animated.View>

      {/* Label */}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
    gap: DS.Spacing.md,
  },
  bubbleContainer: {
    alignItems: 'center',
    width: RING_SIZE + 8,
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: (RING_SIZE + 8) / 2,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: (RING_SIZE + 8) / 2,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  ringGray: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  innerBubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: DS.Color.bg,
    padding: 2,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: (BUBBLE_SIZE - 4) / 2,
  },
  countBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: DS.Grad.accent.colors[1],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: DS.Color.bg,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.Color.bg,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: DS.Color.text2,
    textAlign: 'center',
    maxWidth: RING_SIZE + 8,
  },
});

import React from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type GroupHighlight } from '@/lib/api';

const BUBBLE_SIZE = 64;

interface HighlightsRowProps {
  highlights: GroupHighlight[];
  onHighlightPress: (highlight: GroupHighlight) => void;
  onCreatePress?: () => void;
  canCreate?: boolean;
}

export function HighlightsRow({
  highlights,
  onHighlightPress,
  onCreatePress,
  canCreate = false,
}: HighlightsRowProps) {
  if (highlights.length === 0 && !canCreate) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {canCreate && onCreatePress && (
        <CreateHighlightButton onPress={onCreatePress} />
      )}
      {highlights.map((highlight) => (
        <HighlightBubble
          key={highlight.id}
          highlight={highlight}
          onPress={() => onHighlightPress(highlight)}
        />
      ))}
    </ScrollView>
  );
}

interface CreateHighlightButtonProps {
  onPress: () => void;
}

function CreateHighlightButton({ onPress }: CreateHighlightButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.tap();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.bubbleContainer}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.createBubble}>
          <LinearGradient
            colors={DS.Grad.accent.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createGradient}
          >
            <Plus size={24} color={DS.Color.bg} strokeWidth={2.5} />
          </LinearGradient>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          New
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface HighlightBubbleProps {
  highlight: GroupHighlight;
  onPress: () => void;
}

function HighlightBubble({ highlight, onPress }: HighlightBubbleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.tap();
    onPress();
  };

  const coverUrl = highlight.coverStory?.storagePath
    ? api.highlights.getFileUrl(highlight.coverStory.storagePath)
    : null;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.bubbleContainer}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.highlightRing}>
          <View style={styles.highlightBubble}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImage} />
            ) : (
              <View style={styles.placeholderBubble}>
                <Text style={styles.placeholderEmoji}>📸</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {highlight.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    gap: DS.Spacing.md,
  },
  bubbleContainer: {
    alignItems: 'center',
    width: BUBBLE_SIZE + 12,
  },
  createBubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 2,
    borderColor: DS.Grad.accent.colors[0],
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  createGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  highlightRing: {
    width: BUBBLE_SIZE + 4,
    height: BUBBLE_SIZE + 4,
    borderRadius: (BUBBLE_SIZE + 4) / 2,
    borderWidth: 2,
    borderColor: DS.Color.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightBubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: DS.Color.panel,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBubble: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.Color.panel,
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: DS.Color.text2,
    textAlign: 'center',
    maxWidth: BUBBLE_SIZE + 12,
  },
});

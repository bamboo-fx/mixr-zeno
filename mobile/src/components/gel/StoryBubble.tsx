import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { DS } from '@/lib/ds';

interface StoryBubbleProps {
  imageUrl?: string;
  seen?: boolean;
  size?: number;
  isLive?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function StoryBubble({
  imageUrl,
  seen = false,
  size = 64,
  isLive = false,
  style,
  children,
}: StoryBubbleProps) {
  const ringWidth = size > 60 ? 3 : 2;
  const innerSize = size - ringWidth * 2 - 4;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {!seen && (
        <LinearGradient
          colors={['#EC4899', '#3AE3A0', '#6366F1'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
        />
      )}
      {seen && (
        <View
          style={[
            styles.seenRing,
            { width: size, height: size, borderRadius: size / 2, borderWidth: ringWidth },
          ]}
        />
      )}
      <View
        style={[
          styles.inner,
          { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
          />
        ) : (
          children
        )}
      </View>
      {isLive && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
        </View>
      )}
    </View>
  );
}

interface AddStoryButtonProps {
  onPress?: () => void;
  size?: number;
  style?: ViewStyle;
}

export function AddStoryButton({ onPress, size = 64, style }: AddStoryButtonProps) {
  const innerSize = size - 8;
  return (
    <Pressable onPress={onPress} style={[styles.addWrapper, { width: size, height: size }, style]}>
      <LinearGradient
        colors={['#EC4899', '#3AE3A0', '#6366F1'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.addRing, { width: size, height: size, borderRadius: size / 2 }]}
      />
      <View style={[styles.addInner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
        <LinearGradient
          colors={['rgba(168, 85, 247, 0.25)', 'rgba(99, 102, 241, 0.15)']}
          style={StyleSheet.absoluteFill}
        />
        <Plus size={size * 0.30} color="#7AECC4" strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
  seenRing: {
    position: 'absolute',
    borderColor: 'rgba(150, 150, 150, 0.5)',
  },
  inner: {
    backgroundColor: DS.Color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.Color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DS.Color.error,
  },
  addWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRing: {
    position: 'absolute',
  },
  addInner: {
    backgroundColor: DS.Color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

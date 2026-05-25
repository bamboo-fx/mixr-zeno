import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useInMixerMode } from '@/lib/hooks/use-in-mixer-mode';
import { colors as C, fonts as F } from '@/lib/theme';

// A pulsing pinned banner shown at the top of any screen that includes it,
// visible only while the user is in an active mixer's time window. Tapping
// jumps to the mixer detail.
export function MixerModeBanner() {
  const active = useInMixerMode();
  const router = useRouter();

  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [opacity]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!active) return null;

  return (
    <Pressable
      onPress={() => router.push(`/mixer/${active.id}`)}
      style={styles.wrap}
    >
      <Animated.View style={[styles.dot, dotStyle]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          MIXER MODE
          <Text style={styles.dim}>  ·  {active.groupA?.name ?? 'Group A'} × {active.groupB?.name ?? 'Group B'}</Text>
        </Text>
      </View>
      <Text style={styles.cta}>Open →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(58,227,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(58,227,160,0.35)',
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.mint,
    shadowColor: C.mint,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    color: C.mint,
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  dim: {
    color: C.ink2,
    fontFamily: F.medium,
    letterSpacing: -0.1,
  },
  cta: {
    color: C.mint,
    fontFamily: F.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
});

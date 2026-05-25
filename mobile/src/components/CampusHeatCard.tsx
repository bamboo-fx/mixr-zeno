import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, ChevronRight, MapPin } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

interface CampusHeatCardProps {
  onPress: () => void;
  topVenueName?: string;
  isLoading?: boolean;
}

// One lava-lamp orb that drifts and pulses
function FlameOrb({
  color,
  size,
  initialX,
  initialY,
  duration,
  delay,
  scaleRange,
}: {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
  scaleRange: [number, number];
}) {
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const scale = useSharedValue(scaleRange[0]);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    // Drift horizontally
    x.value = withRepeat(
      withSequence(
        withTiming(initialX + 30, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) }),
        withTiming(initialX - 20, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
        withTiming(initialX + 10, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
        withTiming(initialX, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );

    // Rise upward
    y.value = withRepeat(
      withSequence(
        withTiming(initialY - 40, { duration: duration * 0.6, easing: Easing.inOut(Easing.ease) }),
        withTiming(initialY + 15, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
        withTiming(initialY, { duration: duration * 0.3, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );

    // Breathe scale
    scale.value = withRepeat(
      withSequence(
        withTiming(scaleRange[1], { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
        withTiming(scaleRange[0], { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );

    // Flicker opacity
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 180 }),
        withTiming(0.5, { duration: 120 }),
        withTiming(0.85, { duration: 200 }),
        withTiming(0.65, { duration: 150 }),
        withTiming(0.9, { duration: 180 }),
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// Flicker shimmer bar that sweeps across
function FlameShimmer() {
  const x = useSharedValue(-200);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(400, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-200, { duration: 0 }),
        withTiming(-200, { duration: 1800 }), // pause
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 80,
          borderRadius: 40,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(200,100,255,0.20)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// Animated flame icon
function AnimatedFlameIcon() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.12, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    rotation.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 140, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 100 }),
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 140 }),
        withTiming(0.65, { duration: 100 }),
        withTiming(1, { duration: 140 }),
        withTiming(0.8, { duration: 180 }),
        withTiming(1, { duration: 140 }),
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <Flame size={26} color="#FFF" strokeWidth={1.8} />
    </Animated.View>
  );
}

export function CampusHeatCard({
  onPress,
  topVenueName,
  isLoading = false,
}: CampusHeatCardProps) {
  const cardScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable onPress={() => { Haptics.tap(); onPress(); }} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* ── BASE GRADIENT — deep violet darkness ── */}
        <LinearGradient
          colors={['#0A0010', '#150025', '#0D0018', '#050008']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── FLAME ORBS — purple lava-lamp blobs ── */}
        {/* Core bright violet orb — lower center */}
        <FlameOrb
          color="rgba(168, 50, 255, 0.55)"
          size={120}
          initialX={60}
          initialY={-20}
          duration={2800}
          delay={0}
          scaleRange={[0.85, 1.15]}
        />
        {/* Bright magenta tip orb */}
        <FlameOrb
          color="rgba(230, 80, 255, 0.40)"
          size={80}
          initialX={90}
          initialY={-35}
          duration={2200}
          delay={300}
          scaleRange={[0.7, 1.1]}
        />
        {/* Deep indigo orb — right side */}
        <FlameOrb
          color="rgba(100, 20, 220, 0.55)"
          size={100}
          initialX={220}
          initialY={-10}
          duration={3200}
          delay={600}
          scaleRange={[0.9, 1.2]}
        />
        {/* Purple-pink orb — left */}
        <FlameOrb
          color="rgba(200, 60, 255, 0.40)"
          size={90}
          initialX={-10}
          initialY={5}
          duration={2600}
          delay={200}
          scaleRange={[0.8, 1.05]}
        />
        {/* Bright pink-white hot core — center */}
        <FlameOrb
          color="rgba(240, 140, 255, 0.30)"
          size={60}
          initialX={140}
          initialY={-30}
          duration={1800}
          delay={100}
          scaleRange={[0.75, 1.0]}
        />

        {/* ── SHIMMER sweep — violet hue ── */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <FlameShimmer />
        </View>

        {/* ── TOP GLASS BEVEL ── */}
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.4 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ── BOTTOM DARK SCRIM ── */}
        <LinearGradient
          colors={['transparent', 'rgba(5,0,12,0.60)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ── CONTENT ── */}
        <View style={styles.content}>
          {/* Flame icon in glass circle */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['rgba(180,60,255,0.55)', 'rgba(100,20,200,0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <View style={styles.iconBevel} />
              <AnimatedFlameIcon />
            </LinearGradient>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Campus Heat</Text>
            {isLoading ? (
              <View style={styles.skeletonLine} />
            ) : topVenueName ? (
              <View style={styles.subtitleRow}>
                <MapPin size={11} color="rgba(210,140,255,0.85)" />
                <Text style={styles.subtitle}>{topVenueName} is lit</Text>
              </View>
            ) : (
              <Text style={styles.subtitle}>See where the vibes are</Text>
            )}
          </View>

          <View style={styles.chevronPill}>
            <ChevronRight size={16} color="rgba(220,160,255,0.9)" strokeWidth={2.5} />
          </View>
        </View>

        {/* ── BORDER — violet edge ── */}
        <View style={styles.border} pointerEvents="none" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 72,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.40)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(200,120,255,0.45)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.1,
    textShadowColor: 'rgba(168,85,247,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(210,150,255,0.85)',
    fontWeight: '500',
  },
  skeletonLine: {
    height: 13,
    width: 130,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 4,
  },
  chevronPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.20)',
    borderWidth: 0.5,
    borderColor: 'rgba(200,120,255,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

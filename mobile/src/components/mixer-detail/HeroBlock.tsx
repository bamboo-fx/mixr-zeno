import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { colors as C, fonts as F } from '@/lib/theme';

type Props = {
  // Headline. Renders as two lines: `headlineTop` in white, `headlineAccent` in amber.
  headlineTop: string;       // e.g. "Saturday night"
  headlineAccent: string;    // e.g. "at Frary."
  // Subline teams.
  homeGroupName: string;     // e.g. "PO Soccer"
  awayGroupName: string;     // e.g. "Lit Society"
  // Meta chips.
  dateLabel: string;         // e.g. "Sat 5/25"
  timeLabel: string;         // e.g. "9:00 PM"
  locationLabel: string;     // e.g. "Pomona"
  // Top pill state.
  isGoing: boolean;
};

function GoingDot() {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

// Stacked radial gradients via SVG. Approximates the HTML mockup:
//   - bottom-left crimson bleed
//   - bottom-right amber bleed
//   - top emerald glow fading to black
function HeroBackdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        {/* Top emerald glow → deep teal → black */}
        <RadialGradient id="emerald" cx="50%" cy="0%" rx="120%" ry="80%">
          <Stop offset="0%"  stopColor="#1a5d52" stopOpacity="1" />
          <Stop offset="25%" stopColor="#0a3530" stopOpacity="1" />
          <Stop offset="50%" stopColor="#061814" stopOpacity="1" />
          <Stop offset="85%" stopColor="#000000" stopOpacity="1" />
        </RadialGradient>
        {/* Bottom-left crimson bleed */}
        <RadialGradient id="crimson" cx="0%" cy="100%" rx="60%" ry="50%">
          <Stop offset="0%"  stopColor="#FF4D5E" stopOpacity="0.35" />
          <Stop offset="60%" stopColor="#FF4D5E" stopOpacity="0" />
        </RadialGradient>
        {/* Bottom-right amber bleed */}
        <RadialGradient id="amber" cx="100%" cy="100%" rx="70%" ry="50%">
          <Stop offset="0%"  stopColor="#FFB547" stopOpacity="0.25" />
          <Stop offset="60%" stopColor="#FFB547" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#emerald)" />
      <Rect width="100%" height="100%" fill="url(#crimson)" />
      <Rect width="100%" height="100%" fill="url(#amber)" />
    </Svg>
  );
}

export function HeroBlock({
  headlineTop,
  headlineAccent,
  homeGroupName,
  awayGroupName,
  dateLabel,
  timeLabel,
  locationLabel,
  isGoing,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bg}>
        <HeroBackdrop />
      </View>

      <View style={styles.content}>
        {isGoing && (
          <View style={styles.goingPill}>
            <GoingDot />
            <Text style={styles.goingText}>You're going</Text>
          </View>
        )}

        <Text style={styles.headlineTop}>{headlineTop}</Text>
        <Text style={styles.headlineAccent}>{headlineAccent}</Text>

        <Text style={styles.teams}>
          <Text style={styles.home}>{homeGroupName}</Text>
          <Text style={styles.x}>  ×  </Text>
          <Text style={styles.away}>{awayGroupName}</Text>
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={C.ink} strokeWidth={1.8} />
            <Text style={styles.metaText}>{dateLabel}</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.metaItem}>
            <Clock size={13} color={C.ink} strokeWidth={1.8} />
            <Text style={styles.metaText}>{timeLabel}</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.metaItem}>
            <MapPin size={13} color={C.ink} strokeWidth={1.8} />
            <Text style={styles.metaText}>{locationLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    marginHorizontal: -20,   // pulls the hero edge-to-edge inside the parent's 20px padding
    marginBottom: 8,
    overflow: 'hidden',
  },
  bg: { ...StyleSheet.absoluteFillObject },
  content: { position: 'relative' },

  goingPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(58,227,160,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(58,227,160,0.35)',
    marginBottom: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.mint,
    shadowColor: C.mint,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  goingText: {
    color: C.mint,
    fontFamily: F.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  headlineTop: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.2,
  },
  headlineAccent: {
    color: C.amber,
    fontFamily: F.bold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.2,
    marginBottom: 14,
  },

  teams: {
    fontSize: 16,
    fontFamily: F.bold,
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  home: { color: C.navy, fontFamily: F.bold },
  away: { color: C.crimson, fontFamily: F.bold },
  x: { color: 'rgba(255,255,255,0.5)', fontFamily: F.regular },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: C.ink,
    fontFamily: F.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  sep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 10,
  },
});

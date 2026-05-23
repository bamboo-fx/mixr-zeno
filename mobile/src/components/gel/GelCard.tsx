import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DS } from '@/lib/ds';

interface GelCardProps {
  children: React.ReactNode;
  padding?: number;
  style?: ViewStyle;
  /** Show purple rim lighting glow */
  glow?: boolean;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'flat' | 'glass';
  /** Border radius override */
  borderRadius?: number;
}

/**
 * GelCard — Hyper-realistic liquid glass card.
 * Layered approach:
 *   1. Outer shadow wrapper (shadow never clipped)
 *   2. Optional purple glow layer behind card
 *   3. BlurView base (true frosted glass)
 *   4. LinearGradient overlay (top-bright to bottom-dark for refraction)
 *   5. 1px top-edge highlight (glass edge glint)
 *   6. 1px bottom-edge shadow line (ground shadow)
 *   7. Content on top
 */
export function GelCard({
  children,
  padding = DS.Spacing.lg,
  style,
  glow = false,
  variant = 'default',
  borderRadius = DS.Radius.lg,
}: GelCardProps) {
  const isElevated = variant === 'elevated';
  const isFlat = variant === 'flat';

  // Shadow config per variant
  const shadowConfig: ViewStyle = isElevated
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.50,
        shadowRadius: 28,
        elevation: 14,
      }
    : glow
    ? {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.40,
        shadowRadius: 24,
        elevation: 10,
      }
    : isFlat
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
        shadowRadius: 6,
        elevation: 3,
      }
    : {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.40,
        shadowRadius: 20,
        elevation: 10,
      };

  // Blur intensity: elevated = more frosted, flat = minimal
  const blurIntensity = isElevated ? 80 : isFlat ? 35 : 65;

  // Border color per variant
  const borderColor = glow
    ? 'rgba(168,85,247,0.35)'
    : isElevated
    ? 'rgba(255,255,255,0.18)'
    : isFlat
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.12)';

  // Gradient colors: subtle top-bright to bottom-dark refractive look
  const gradientColors: [string, string, string] = isElevated
    ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.08)']
    : isFlat
    ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)']
    : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)'];

  return (
    // Outer wrapper holds the shadow — must not have overflow:hidden
    <View
      style={[
        styles.shadowWrapper,
        { borderRadius, ...shadowConfig },
        style,
      ]}
    >
      {/* Optional purple glow halo behind the card */}
      {glow && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              backgroundColor: 'rgba(168,85,247,0.25)',
              transform: [{ scaleX: 1.05 }, { scaleY: 1.12 }],
              // blur the glow layer by making it a large soft blob
              shadowColor: '#A855F7',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 32,
              elevation: 0,
            },
          ]}
        />
      )}

      {/* BlurView — the frosted glass base, must have overflow:hidden to clip blur */}
      <View
        style={[
          styles.cardContainer,
          {
            borderRadius,
            borderColor,
            borderWidth: 1,
          },
        ]}
      >
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />

        {/* Refractive gradient overlay — top lighter, bottom darker */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />

        {/* 1px top-edge highlight — glass edge glint */}
        <View
          pointerEvents="none"
          style={[
            styles.topHighlight,
            { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
          ]}
        />

        {/* 1px bottom-edge shadow line — deepens the glass */}
        <View
          pointerEvents="none"
          style={[
            styles.bottomShadow,
            { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius },
          ]}
        />

        {/* Card content */}
        <View style={[styles.content, { padding }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    // Shadow props applied inline per variant
  },
  cardContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
    zIndex: 2,
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.30)',
    zIndex: 2,
  },
  content: {
    position: 'relative',
    zIndex: 3,
  },
});

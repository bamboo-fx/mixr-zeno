import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DS } from '@/lib/ds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumBackgroundProps {
  children?: React.ReactNode;
}

export function PremiumBackground({ children }: PremiumBackgroundProps) {
  return (
    <View style={styles.container}>
      {/* Base background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: DS.Color.bg }]} />

      {/* Top-right gradient glow */}
      <View style={styles.glowContainer1}>
        <LinearGradient
          colors={DS.Grad.accent.colors}
          start={DS.Grad.accent.start}
          end={DS.Grad.accent.end}
          style={styles.glow1}
        />
      </View>

      {/* Bottom-left gradient glow */}
      <View style={styles.glowContainer2}>
        <LinearGradient
          colors={DS.Grad.accent.colors}
          start={DS.Grad.accent.start}
          end={DS.Grad.accent.end}
          style={styles.glow2}
        />
      </View>

      {/* Subtle overlay for texture */}
      <View style={styles.overlay} />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.Color.bg,
  },
  glowContainer1: {
    position: 'absolute',
    top: -260,
    right: -100,
    width: 520,
    height: 520,
    opacity: 0.22,
  },
  glow1: {
    width: '100%',
    height: '100%',
    borderRadius: 260,
  },
  glowContainer2: {
    position: 'absolute',
    bottom: -80,
    left: -200,
    width: 420,
    height: 420,
    opacity: 0.16,
  },
  glow2: {
    width: '100%',
    height: '100%',
    borderRadius: 210,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
});

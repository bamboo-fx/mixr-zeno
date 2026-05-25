import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

// Per-tab gradient palette. Each tab gets a distinct top-glow color so the
// backdrop signals where the user is without needing to read the title.
//
// Top hex = the dominant glow.
// Mid hex = darker shade of the top color to deepen the fade.
// Bleed1/Bleed2 = bottom corner accents (rgba with alpha).
type Palette = {
  topGlow: string;
  topDeep: string;
  bleed1: { color: string; opacity: number };  // bottom-left
  bleed2: { color: string; opacity: number };  // bottom-right
};

const PALETTES: Record<string, Palette> = {
  emerald: {
    topGlow: '#1a5d52',
    topDeep: '#0a3530',
    bleed1: { color: '#FF4D5E', opacity: 0.30 },
    bleed2: { color: '#FFB547', opacity: 0.22 },
  },
  navy: {
    topGlow: '#1F3A8A',
    topDeep: '#0F1F4D',
    bleed1: { color: '#4F7CFF', opacity: 0.28 },
    bleed2: { color: '#3AE3A0', opacity: 0.20 },
  },
  crimson: {
    topGlow: '#5A1A28',
    topDeep: '#2E0B16',
    bleed1: { color: '#4F7CFF', opacity: 0.28 },
    bleed2: { color: '#FFB547', opacity: 0.24 },
  },
  amber: {
    topGlow: '#5A3A14',
    topDeep: '#2A1A06',
    bleed1: { color: '#FF4D5E', opacity: 0.26 },
    bleed2: { color: '#4F7CFF', opacity: 0.22 },
  },
};

export type HeaderBackdropVariant = keyof typeof PALETTES;

// Shared hero backdrop. Sits behind page titles, ~260px tall, fades to black.
export function HeaderBackdrop({
  height = 260,
  variant = 'emerald',
}: {
  height?: number;
  variant?: HeaderBackdropVariant;
}) {
  const p = PALETTES[variant] ?? PALETTES.emerald!;
  // Unique ids per variant so multiple instances on one page don't clash.
  const idTop = `hb-top-${variant}`;
  const idB1 = `hb-b1-${variant}`;
  const idB2 = `hb-b2-${variant}`;

  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={idTop} cx="50%" cy="0%" rx="120%" ry="80%">
            <Stop offset="0%"  stopColor={p.topGlow} stopOpacity="1" />
            <Stop offset="30%" stopColor={p.topDeep} stopOpacity="1" />
            <Stop offset="55%" stopColor="#061814" stopOpacity="1" />
            <Stop offset="90%" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id={idB1} cx="0%" cy="100%" rx="60%" ry="50%">
            <Stop offset="0%"  stopColor={p.bleed1.color} stopOpacity={p.bleed1.opacity} />
            <Stop offset="60%" stopColor={p.bleed1.color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={idB2} cx="100%" cy="100%" rx="70%" ry="50%">
            <Stop offset="0%"  stopColor={p.bleed2.color} stopOpacity={p.bleed2.opacity} />
            <Stop offset="60%" stopColor={p.bleed2.color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${idTop})`} />
        <Rect width="100%" height="100%" fill={`url(#${idB1})`} />
        <Rect width="100%" height="100%" fill={`url(#${idB2})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

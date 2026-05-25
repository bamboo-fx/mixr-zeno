/**
 * MIXR Design System - Premium Dark Theme
 * True black backgrounds, flat dark surfaces, purple used sparingly.
 * Inspired by Spotify, Linear, Vercel, Apple Music.
 */

export const DS = {
  Spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },

  Radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },

  Stroke: {
    hairline: StyleSheet_hairlineWidth(),
    normal: 1,
  },

  Shadow: {
    soft: { radius: 16, y: 8, opacity: 0.3 },
    lift: { radius: 24, y: 12, opacity: 0.4 },
    glow: { radius: 20, y: 4, opacity: 0.35 },
  },

  // Premium Dark Color System
  Color: {
    // Backgrounds — true black
    bg: '#211621',
    bgSecondary: '#1e131e',
    bgTertiary: '#1a101a',
    bgLight: '#2e1f2e',

    // Brand purples — used SPARINGLY
    purple: '#7C3AED',
    purpleLight: '#A855F7',
    purpleBright: '#9333EA',
    violet: '#4F7CFF',
    fuchsia: '#FF4D5E',
    pinkSparkle: '#FF7BD1',

    // Surfaces — flat dark, NOT glass
    glass: 'rgba(255, 255, 255, 0.06)',
    glassLight: 'rgba(255, 255, 255, 0.09)',
    glassDark: 'rgba(255, 255, 255, 0.04)',
    glassChrome: 'rgba(255, 255, 255, 0.12)',

    // Panels — flat dark cards
    panel: '#111111',
    panel2: '#0D0D0D',

    // Strokes — neutral white-based, NOT purple
    stroke: 'rgba(255, 255, 255, 0.08)',
    strokeLight: 'rgba(255, 255, 255, 0.12)',
    strokeHighlight: 'rgba(255, 255, 255, 0.18)',
    strokePurple: 'rgba(168, 85, 247, 0.35)',

    // Text hierarchy — clean neutrals
    text: '#FFFFFF',
    text2: '#A0A0A0',
    text3: '#606060',
    textDark: '#000000',

    // Semantic
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Dividers
    divider: 'rgba(255, 255, 255, 0.06)',
    dividerLight: 'rgba(255, 255, 255, 0.08)',

    // Accent — mint (was purple, retained property name for compatibility)
    gelPurple: '#3AE3A0',
    deepPurple: '#28C988',
    lavender: '#7AECC4',
  },

  // Gradients — minimal, purposeful
  Grad: {
    // Main background — pure black
    purpleBg: {
      colors: ['#000000', '#000000'] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },

    // Bottom glow — very subtle
    bottomGlow: {
      colors: ['transparent', 'rgba(120, 40, 180, 0.08)'] as const,
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.5, y: 1 },
    },

    // Purple glow
    purpleGlow: {
      colors: ['rgba(139, 58, 180, 0.3)', 'transparent'] as const,
      start: { x: 0.5, y: 0.5 },
      end: { x: 1, y: 1 },
    },

    // Primary action gradient — purple
    gelGlow: {
      colors: ['#A855F7', '#7C3AED'] as const,
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },

    // Chrome glass (selective use only)
    liquidGlass: {
      colors: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.04)'] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },

    // Purple to pink — for hero/special moments
    purplePink: {
      colors: ['#7C3AED', '#A855F7', '#FF4D5E'] as const,
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },

    // Iridescent ring for stories
    iridescent: {
      colors: ['#A855F7', '#D8B4FE', '#FF7BD1', '#A855F7'] as const,
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },

    // Glass surface
    glassSurface: {
      colors: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },

    // Legacy accent (kept for compatibility)
    accent: {
      colors: ['#A855F7', '#7C3AED'] as const,
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },

    // Lavender wash (legacy)
    lavenderWash: {
      colors: ['#000000', '#060606', '#000000'] as const,
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },

  // Typography
  Font: {
    size: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      title: 28,
      hero: 34,
    },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
  },

  // Animation timings
  Motion: {
    fast: 120,
    normal: 220,
    slow: 380,
    spring: {
      damping: 18,
      stiffness: 350,
      mass: 1,
    },
  },
} as const;

// Inline helper to avoid import cycle
function StyleSheet_hairlineWidth() {
  return 0.5;
}

// Helper type for gradient colors
export type GradientConfig = {
  colors: readonly string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

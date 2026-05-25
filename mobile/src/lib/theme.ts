// Design tokens — single source of truth for the mixr UI refresh.
// Palette rule: mint is hero-only ("You're going" state). Below hero,
// warm sports-bar — navy + crimson teams, amber typographic accent,
// crimson for active/voted state. White CTAs.

export const colors = {
  bg: '#000000',
  surface: '#111111',
  surface2: '#181818',
  surface3: 'rgba(255,255,255,0.06)',

  ink: '#FFFFFF',
  ink2: '#888888',
  ink3: '#7A7A7A',

  mint: '#3AE3A9',
  amber: '#FF8547',
  crimson: '#FF405E',
  navy: '#4F7CFF',

  hairline: 'rgba(255,255,255,0.08)',
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

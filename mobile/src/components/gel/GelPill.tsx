import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DS } from '@/lib/ds';

interface GelPillProps {
  text: string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'info' | 'muted' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * GelPill — Liquid glass floating capsule badges.
 * Each variant is a translucent, layered glass capsule:
 *   1. BlurView base (real frosted glass)
 *   2. Tinted gradient overlay (color-coded translucent fill)
 *   3. 0.5px colored border (crisp glass edge)
 *   4. Optional glow shadow for active/accent variants
 */
export function GelPill({
  text,
  variant = 'default',
  size = 'sm',
  icon,
  selected,
  onPress,
  style,
}: GelPillProps) {
  const activeVariant = selected ? 'accent' : variant;
  const config = getVariantConfig(activeVariant);
  const sizeStyle = getSizeStyle(size);
  const borderRadius = getBorderRadius(size);

  const inner = (
    <View
      style={[
        styles.pillShadowWrapper,
        { borderRadius, ...config.shadowStyle },
        style,
      ]}
    >
      <View
        style={[
          styles.pillContainer,
          sizeStyle,
          {
            borderRadius,
            borderColor: config.borderColor,
          },
        ]}
      >
        {/* BlurView — frosted glass base */}
        <BlurView
          intensity={40}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />

        {/* Color-tinted gradient overlay */}
        <LinearGradient
          colors={config.gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />

        {/* Top glint */}
        <View
          style={[styles.topGlint, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          pointerEvents="none"
        />

        {/* Content */}
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, getSizeTextStyle(size), { color: config.textColor }]}>
            {text}
          </Text>
          {selected && (
            <Text style={styles.checkText}>✓</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.wrapper}>
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{inner}</View>;
}

function getVariantConfig(variant: GelPillProps['variant']): {
  gradientColors: [string, string];
  borderColor: string;
  textColor: string;
  shadowStyle: ViewStyle;
} {
  switch (variant) {
    case 'accent':
      return {
        gradientColors: ['rgba(168,85,247,0.30)', 'rgba(124,58,237,0.18)'],
        borderColor: 'rgba(168,85,247,0.50)',
        textColor: '#E9D5FF',
        shadowStyle: {
          shadowColor: '#A855F7',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 5,
        },
      };
    case 'success':
      return {
        gradientColors: ['rgba(34,197,94,0.28)', 'rgba(22,163,74,0.15)'],
        borderColor: 'rgba(34,197,94,0.45)',
        textColor: '#86EFAC',
        shadowStyle: {
          shadowColor: '#22C55E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 4,
        },
      };
    case 'warning':
      return {
        gradientColors: ['rgba(245,158,11,0.28)', 'rgba(217,119,6,0.15)'],
        borderColor: 'rgba(245,158,11,0.45)',
        textColor: '#FCD34D',
        shadowStyle: {
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 4,
        },
      };
    case 'info':
      return {
        gradientColors: ['rgba(59,130,246,0.28)', 'rgba(37,99,235,0.15)'],
        borderColor: 'rgba(59,130,246,0.45)',
        textColor: '#93C5FD',
        shadowStyle: {
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.20,
          shadowRadius: 6,
          elevation: 4,
        },
      };
    case 'muted':
      return {
        gradientColors: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)'],
        borderColor: 'rgba(255,255,255,0.10)',
        textColor: 'rgba(255,255,255,0.45)',
        shadowStyle: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 2,
        },
      };
    case 'outline':
      return {
        gradientColors: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'],
        borderColor: 'rgba(255,255,255,0.14)',
        textColor: 'rgba(255,255,255,0.60)',
        shadowStyle: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        },
      };
    default: // 'default' / neutral
      return {
        gradientColors: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'],
        borderColor: 'rgba(255,255,255,0.12)',
        textColor: 'rgba(255,255,255,0.75)',
        shadowStyle: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.20,
          shadowRadius: 5,
          elevation: 3,
        },
      };
  }
}

function getSizeStyle(size: GelPillProps['size']): ViewStyle {
  switch (size) {
    case 'lg': return { paddingVertical: 9, paddingHorizontal: 18 };
    case 'md': return { paddingVertical: 7, paddingHorizontal: 14 };
    default:   return { paddingVertical: 5, paddingHorizontal: 11 };
  }
}

function getBorderRadius(size: GelPillProps['size']): number {
  switch (size) {
    case 'lg': return 100;
    case 'md': return 100;
    default:   return 100;
  }
}

function getSizeTextStyle(size: GelPillProps['size']) {
  switch (size) {
    case 'lg': return { fontSize: 14, letterSpacing: 0.15 };
    case 'md': return { fontSize: 13, letterSpacing: 0.12 };
    default:   return { fontSize: 11, letterSpacing: 0.10 };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  pillShadowWrapper: {
    // shadow applied inline
  },
  pillContainer: {
    borderWidth: 0.5,
    overflow: 'hidden',
    position: 'relative',
  },
  topGlint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    zIndex: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    zIndex: 3,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
});

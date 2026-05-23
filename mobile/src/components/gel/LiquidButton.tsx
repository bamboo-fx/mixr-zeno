import React from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

type LiquidButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
type LiquidButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface LiquidButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: LiquidButtonVariant;
  size?: LiquidButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * LiquidButton - Frosted glass button with inset shadows and liquid glass effect
 * Inspired by modern glass morphism with deep inset shadows creating a bubble/liquid look
 */
export function LiquidButton({
  children,
  onPress,
  variant = 'default',
  size = 'lg',
  fullWidth = false,
  disabled = false,
  style,
}: LiquidButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, 1]) },
    ],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    pressed.value = withSpring(0, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.medium();
      onPress();
    }
  };

  const sizeStyles = getSizeStyles(size);
  const variantColors = getVariantColors(variant, disabled);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.wrapper,
          fullWidth && styles.fullWidth,
          animatedStyle,
          style,
        ]}
      >
        {/* Outer shadow for depth */}
        <View style={[styles.shadowOuter, { shadowColor: variantColors.shadowColor }]} />

        {/* Main button container */}
        <View style={[styles.buttonOuter, sizeStyles.button]}>
          {/* Blur background */}
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

          {/* Background gradient */}
          <LinearGradient
            colors={variantColors.bgGradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Inset shadow simulation - top-left light */}
          <View style={styles.insetTopLeft} />

          {/* Inset shadow simulation - bottom-right dark */}
          <View style={styles.insetBottomRight} />

          {/* Inner glow ring */}
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.innerGlow]}
          />

          {/* Specular highlight at top */}
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={styles.specularTop}
          />

          {/* Content */}
          <View style={styles.content}>
            {typeof children === 'string' ? (
              <Text style={[styles.text, sizeStyles.text, { color: variantColors.textColor }]}>
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getSizeStyles(size: LiquidButtonSize): { button: ViewStyle; text: TextStyle } {
  switch (size) {
    case 'sm':
      return {
        button: { height: 36, paddingHorizontal: 16, borderRadius: 18 },
        text: { fontSize: 13 },
      };
    case 'md':
      return {
        button: { height: 42, paddingHorizontal: 20, borderRadius: 21 },
        text: { fontSize: 14 },
      };
    case 'lg':
      return {
        button: { height: 48, paddingHorizontal: 24, borderRadius: 24 },
        text: { fontSize: 15 },
      };
    case 'xl':
      return {
        button: { height: 54, paddingHorizontal: 28, borderRadius: 27 },
        text: { fontSize: 16 },
      };
    case 'xxl':
      return {
        button: { height: 60, paddingHorizontal: 36, borderRadius: 30 },
        text: { fontSize: 17 },
      };
  }
}

function getVariantColors(variant: LiquidButtonVariant, disabled: boolean) {
  if (disabled) {
    return {
      bgGradient: ['rgba(80, 80, 80, 0.2)', 'rgba(60, 60, 60, 0.15)'],
      textColor: 'rgba(255, 255, 255, 0.35)',
      shadowColor: '#333333',
    };
  }

  switch (variant) {
    case 'primary':
      return {
        bgGradient: ['rgba(168, 85, 247, 0.35)', 'rgba(139, 92, 246, 0.25)', 'rgba(124, 58, 237, 0.30)'],
        textColor: '#FFFFFF',
        shadowColor: '#A855F7',
      };
    case 'secondary':
      return {
        bgGradient: ['rgba(139, 92, 246, 0.18)', 'rgba(109, 40, 217, 0.12)'],
        textColor: '#E9D5FF',
        shadowColor: '#7C3AED',
      };
    case 'ghost':
      return {
        bgGradient: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'],
        textColor: '#C084FC',
        shadowColor: '#6D28D9',
      };
    case 'destructive':
      return {
        bgGradient: ['rgba(239, 68, 68, 0.35)', 'rgba(220, 38, 38, 0.25)'],
        textColor: '#FFFFFF',
        shadowColor: '#EF4444',
      };
    default:
      return {
        bgGradient: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'],
        textColor: '#E2E8F0',
        shadowColor: '#64748B',
      };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  shadowOuter: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: -2,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonOuter: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  insetTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  insetBottomRight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  innerGlow: {
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  specularTop: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: '45%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

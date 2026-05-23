import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

interface GelButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function GelButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
}: GelButtonProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 450 });
    translateY.value = withSpring(1, { damping: 20, stiffness: 450 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 400 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 400 });
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.medium();
      onPress();
    }
  };

  const sizeStyles = getSizeStyles(size);

  // ── Primary — vibrant purple gradient pill with glass bevel ─────────────
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={fullWidth ? styles.fullWidthPressable : undefined}
      >
        <Animated.View
          style={[
            animatedStyle,
            { borderRadius: 100 },
            disabled ? styles.disabledShadow : styles.primaryShadow,
            style,
          ]}
        >
          {/* Main gradient body */}
          <LinearGradient
            colors={
              disabled
                ? ['rgba(168,85,247,0.18)', 'rgba(124,58,237,0.12)', 'rgba(100,40,200,0.10)']
                : ['#C084FC', '#A855F7', '#7C3AED']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[
              styles.button,
              sizeStyles.button,
              fullWidth && styles.fullWidth,
              styles.primaryBorder,
              { borderRadius: 100 },
            ]}
          >
            {/* Glass bevel — top-half highlight giving it a convex pill look */}
            <LinearGradient
              colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.00)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                StyleSheet.absoluteFill,
                styles.glassBevel,
                { borderRadius: 100 },
              ]}
              pointerEvents="none"
            />

            <View style={styles.content}>
              {leftIcon}
              <Text
                style={[
                  styles.text,
                  sizeStyles.text,
                  styles.primaryText,
                  disabled && styles.disabledText,
                ]}
              >
                {title}
              </Text>
              {rightIcon}
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  // ── Danger — red-tinted glass pill ───────────────────────────────────────
  if (variant === 'danger') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={fullWidth ? styles.fullWidthPressable : undefined}
      >
        <Animated.View style={[animatedStyle, styles.dangerShadow, { borderRadius: 100 }, style]}>
          <View
            style={[
              styles.button,
              sizeStyles.button,
              fullWidth && styles.fullWidth,
              styles.dangerButton,
              { borderRadius: 100 },
            ]}
          >
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            {/* Red-tinted gradient */}
            <LinearGradient
              colors={['rgba(239,68,68,0.22)', 'rgba(220,38,38,0.14)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 100 }]}
            />
            {/* Top glint */}
            <View style={styles.secondaryTopHighlight} pointerEvents="none" />
            <View style={styles.content}>
              {leftIcon}
              <Text style={[styles.text, sizeStyles.text, { color: '#FCA5A5', fontWeight: '600' }]}>
                {title}
              </Text>
              {rightIcon}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  // ── Secondary — frosted glass pill ───────────────────────────────────────
  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={fullWidth ? styles.fullWidthPressable : undefined}
      >
        <Animated.View style={[animatedStyle, styles.secondaryShadow, { borderRadius: 100 }, style]}>
          <View
            style={[
              styles.button,
              sizeStyles.button,
              fullWidth && styles.fullWidth,
              styles.secondaryButton,
              { borderRadius: 100 },
            ]}
          >
            {/* BlurView frosted glass base */}
            <BlurView
              intensity={50}
              tint="dark"
              style={[StyleSheet.absoluteFill, { borderRadius: 100 }]}
            />
            {/* Subtle white gradient overlay */}
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 100 }]}
            />
            {/* 1px top glint */}
            <View style={styles.secondaryTopHighlight} pointerEvents="none" />
            <View style={styles.content}>
              {leftIcon}
              <Text style={[styles.text, sizeStyles.text, { color: '#FFFFFF', fontWeight: '600' }]}>
                {title}
              </Text>
              {rightIcon}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  // ── Ghost — minimal transparent pill ─────────────────────────────────────
  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={fullWidth ? styles.fullWidthPressable : undefined}
    >
      <Animated.View style={[animatedStyle, { borderRadius: 100 }, style]}>
        <View
          style={[
            styles.button,
            sizeStyles.button,
            fullWidth && styles.fullWidth,
            styles.ghostButton,
            { borderRadius: 100 },
          ]}
        >
          <View style={styles.content}>
            {leftIcon}
            <Text style={[styles.text, sizeStyles.text, { color: '#A855F7', fontWeight: '600' }]}>
              {title}
            </Text>
            {rightIcon}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getSizeStyles(size: 'sm' | 'md' | 'lg'): {
  button: ViewStyle;
  text: TextStyle;
} {
  switch (size) {
    case 'sm':
      return {
        button: { paddingVertical: 10, paddingHorizontal: 18 },
        text: { fontSize: DS.Font.size.sm },
      };
    case 'lg':
      return {
        button: { paddingVertical: 17, paddingHorizontal: 32 },
        text: { fontSize: DS.Font.size.lg },
      };
    default: // md
      return {
        button: { paddingVertical: 14, paddingHorizontal: 26 },
        text: { fontSize: DS.Font.size.md },
      };
  }
}

const styles = StyleSheet.create({
  fullWidthPressable: {
    alignSelf: 'stretch',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    position: 'relative',
  },

  // Glass bevel overlay — top half highlights, makes button look convex/3D
  glassBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Only covers the top half of the button
    bottom: '50%',
  },

  // ── Primary ──────────────────────────────────────────────────────────────
  primaryShadow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.60,
    shadowRadius: 16,
    elevation: 12,
  },
  disabledShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBorder: {
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },

  // ── Secondary ─────────────────────────────────────────────────────────────
  secondaryShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    zIndex: 1,
  },

  // ── Danger ────────────────────────────────────────────────────────────────
  dangerShadow: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },

  // ── Ghost ─────────────────────────────────────────────────────────────────
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 2,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledText: {
    opacity: 0.45,
  },
});

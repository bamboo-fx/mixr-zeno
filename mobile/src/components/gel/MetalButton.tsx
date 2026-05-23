import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ColorVariant = 'default' | 'primary' | 'success' | 'error';

interface MetalButtonProps {
  children: React.ReactNode;
  variant?: ColorVariant;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  height?: number;
}

const colorVariants: Record<
  ColorVariant,
  {
    outerColors: [string, string];
    innerColors: [string, string, string];
    buttonColors: [string, string];
  }
> = {
  default: {
    outerColors: ['#000000', '#A0A0A0'],
    innerColors: ['#FAFAFA', '#3E3E3E', '#E5E5E5'],
    buttonColors: ['#B9B9B9', '#969696'],
  },
  primary: {
    outerColors: ['#2D0A4E', '#A855F7'],
    innerColors: ['#E9D5FF', '#581C87', '#D8B4FE'],
    buttonColors: ['#C084FC', '#7C3AED'],
  },
  success: {
    outerColors: ['#005A43', '#7CCB9B'],
    innerColors: ['#E5F8F0', '#00352F', '#D1F0E6'],
    buttonColors: ['#9ADBC8', '#3E8F7C'],
  },
  error: {
    outerColors: ['#5A0000', '#FFAEB0'],
    innerColors: ['#FFDEDE', '#680002', '#FFE9E9'],
    buttonColors: ['#F08D8F', '#A45253'],
  },
};

export function MetalButton({
  children,
  variant = 'primary',
  onPress,
  disabled = false,
  fullWidth = false,
  height = 56,
}: MetalButtonProps) {
  const colors = colorVariants[variant];
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    translateY.value = withSpring(2, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, fullWidth ? { width: '100%' } : undefined]}
    >
      {/* Outer gradient (the rim) */}
      <LinearGradient
        colors={colors.outerColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 1.5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Inner gradient (the bevel) */}
        <LinearGradient
          colors={colors.innerColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ borderRadius: 14, padding: 1 }}
        >
          {/* Button face */}
          <LinearGradient
            colors={colors.buttonColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              borderRadius: 13,
              height,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
              gap: 8,
            }}
          >
            {typeof children === 'string' ? (
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: -1 },
                  textShadowRadius: 0,
                }}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </LinearGradient>
        </LinearGradient>
      </LinearGradient>
    </AnimatedPressable>
  );
}

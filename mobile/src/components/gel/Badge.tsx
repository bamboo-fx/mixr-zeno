import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type BadgeVariant = 'default' | 'selected' | 'outline' | 'muted';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  selected?: boolean;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const sizeStyles: Record<BadgeSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 28, paddingHorizontal: 12, fontSize: 12 },
  md: { height: 32, paddingHorizontal: 16, fontSize: 14 },
  lg: { height: 40, paddingHorizontal: 20, fontSize: 14 },
};

type VariantStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  shadow: ViewStyle;
};

const getVariantStyle = (variant: BadgeVariant): VariantStyle => {
  switch (variant) {
    case 'selected':
      return {
        backgroundColor: '#3AE3A0',
        borderColor: '#7AECC4',
        textColor: '#FFFFFF',
        shadow: {
          shadowColor: '#3AE3A0',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: 'rgba(168,85,247,0.4)',
        textColor: '#FFE5BC',
        shadow: {},
      };
    case 'muted':
      return {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        textColor: 'rgba(255,255,255,0.6)',
        shadow: {},
      };
    default:
      return {
        backgroundColor: 'rgba(168,85,247,0.2)',
        borderColor: 'rgba(168,85,247,0.3)',
        textColor: '#E9D5FF',
        shadow: {},
      };
  }
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  selected = false,
  icon,
  onPress,
  style,
}: BadgeProps) {
  const scale = useSharedValue(1);
  const activeVariant = selected ? 'selected' : variant;
  const variantStyle = getVariantStyle(activeVariant);
  const sizing = sizeStyles[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        variantStyle.shadow,
        {
          height: sizing.height,
          paddingHorizontal: sizing.paddingHorizontal,
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderWidth: 1,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        },
        style,
      ]}
    >
      {icon && <View>{icon}</View>}

      {typeof children === 'string' ? (
        <Text
          style={{
            fontSize: sizing.fontSize,
            fontWeight: '500',
            color: variantStyle.textColor,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}

      {selected && <Check size={14} color="white" strokeWidth={2.5} />}
    </AnimatedPressable>
  );
}

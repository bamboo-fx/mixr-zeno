import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlowButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  glowColor?: string;
  style?: object;
}

export function GlowButton({
  children,
  onPress,
  glowColor = '#3AE3A0',
  style,
}: GlowButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      <LinearGradient
        colors={['#2d1b4e', '#1a0a2e']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.container,
          {
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
            borderColor: 'rgba(168,85,247,0.3)',
          },
        ]}
      >
        {/* Right edge glow accent */}
        <View
          style={[
            styles.edgeGlow,
            {
              backgroundColor: glowColor,
              shadowColor: glowColor,
              shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
            },
          ]}
        />

        {typeof children === 'string' ? (
          <Text style={styles.text}>{children}</Text>
        ) : (
          children
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  edgeGlow: {
    position: 'absolute',
    right: 0,
    top: '25%',
    bottom: '25%',
    width: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  text: {
    color: '#E9D5FF',
    fontSize: 14,
    fontWeight: '500',
  },
});

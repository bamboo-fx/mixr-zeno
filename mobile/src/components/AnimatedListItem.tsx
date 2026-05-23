import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const delay = index * 50;
    opacity.value = withDelay(delay, withSpring(1, SPRING_CONFIG));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG));
    scale.value = withDelay(delay, withSpring(1, SPRING_CONFIG));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// Simplified entering animation for FlatList/ScrollView items
export const listItemEntering = (index: number) =>
  FadeInDown.delay(index * 50).springify().damping(20).stiffness(200);

import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StoryAddButtonProps {
  onPress?: () => void;
  label?: string;
  style?: ViewStyle;
}

export function StoryAddButton({
  onPress,
  label = 'Add Story',
  style,
}: StoryAddButtonProps) {
  const scale = useSharedValue(1);

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
    <View style={[styles.wrapper, style]}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        {/* Gradient ring */}
        <LinearGradient
          colors={['#EC4899', '#A855F7', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        >
          <View style={styles.ringInner}>
            <LinearGradient
              colors={['#F472B6', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plusCircle}
            >
              <Plus size={24} color="white" strokeWidth={2.5} />
            </LinearGradient>
          </View>
        </LinearGradient>
      </AnimatedPressable>

      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  ringInner: {
    flex: 1,
    borderRadius: 33,
    backgroundColor: '#1a0a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: 'rgba(216,180,254,0.7)',
  },
});

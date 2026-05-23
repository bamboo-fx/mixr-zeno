import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

interface StoryCameraFABProps {
  onPress: () => void;
  visible: boolean;
  mixerCount?: number;
}

export function StoryCameraFAB({ onPress, visible, mixerCount = 1 }: StoryCameraFABProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  // Subtle pulse animation
  React.useEffect(() => {
    if (visible) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [visible, pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: visible ? 1 : 0,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.medium();
    onPress();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 90 }, // Above tab bar
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Glow effect */}
        <Animated.View style={[styles.glow, pulseStyle]}>
          <LinearGradient
            colors={DS.Grad.accent.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowGradient}
          />
        </Animated.View>

        {/* Button */}
        <LinearGradient
          colors={DS.Grad.accent.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Camera size={26} color={DS.Color.bg} strokeWidth={2.5} />
        </LinearGradient>

        {/* Badge for multiple mixers */}
        {mixerCount > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{mixerCount}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: DS.Spacing.lg,
    zIndex: 100,
  },
  glow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 34,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: DS.Grad.accent.colors[1],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: DS.Color.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.Color.bg,
  },
});

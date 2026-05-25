import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

interface GelSegmentedControlProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  style?: ViewStyle;
}

export function GelSegmentedControl({
  items,
  selectedIndex,
  onSelect,
  style,
}: GelSegmentedControlProps) {
  const translateX = useSharedValue(0);
  const itemWidthPct = 100 / items.length;

  React.useEffect(() => {
    translateX.value = withSpring(selectedIndex * itemWidthPct, {
      damping: 22,
      stiffness: 380,
      mass: 0.8,
    });
  }, [selectedIndex, itemWidthPct, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    left: `${translateX.value}%`,
    width: `${itemWidthPct}%`,
  }));

  return (
    // Outer wrapper — carries the elevation shadow
    <View style={[styles.shadow, style]}>
      {/* Card body */}
      <View style={styles.track}>
        {/* Blur base */}
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Dark overlay tint */}
        <View style={[StyleSheet.absoluteFill, styles.tintOverlay]} />

        {/* Specular top edge */}
        <View style={styles.specularEdge} />

        {/* Inset groove: subtle inner shadow to make it feel pressed-in */}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={[StyleSheet.absoluteFill, styles.insetShadow]}
          pointerEvents="none"
        />

        {/* Sliding pill */}
        <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none">
          {/* Pill: gradient from purple-tinted to deep glass */}
          <LinearGradient
            colors={['rgba(168,85,247,0.55)', 'rgba(109,40,217,0.75)', 'rgba(88,28,220,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillInner}
          >
            {/* Pill top specular */}
            <LinearGradient
              colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.55 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 9 }]}
              pointerEvents="none"
            />
          </LinearGradient>
        </Animated.View>

        {/* Labels */}
        <View style={styles.labelsRow}>
          {items.map((item, index) => (
            <Pressable
              key={index}
              style={styles.labelTouchTarget}
              onPress={() => {
                Haptics.tap();
                onSelect(index);
              }}
            >
              <Text style={[styles.label, selectedIndex === index && styles.labelActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    // Outer card elevation
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.50,
    shadowRadius: 14,
    elevation: 10,
  },
  track: {
    height: 44,
    borderRadius: 14,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(12,8,22,0.75)',
  },
  tintOverlay: {
    borderRadius: 14,
    backgroundColor: 'rgba(60,20,100,0.25)',
  },
  specularEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    zIndex: 3,
  },
  insetShadow: {
    borderRadius: 14,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    padding: 2,
    zIndex: 1,
  },
  pillInner: {
    flex: 1,
    borderRadius: 9,
    overflow: 'hidden',
    // Pill drop shadow — lifts it off the track
    shadowColor: '#28C988',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.60,
    shadowRadius: 8,
    elevation: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  labelTouchTarget: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

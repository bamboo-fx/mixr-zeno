import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

const INNER_PADDING = 3;
const SPRING_CONFIG = { damping: 22, stiffness: 320, mass: 0.8 };

/**
 * SegmentedControl — iOS-native liquid glass segmented control.
 *
 * Architecture:
 *   Container: BlurView (intensity 40) + rgba overlay + 1px border
 *   Active pill: Animated white LinearGradient pill that slides with spring physics
 *   Active label: #000000 (dark on white = max legibility)
 *   Inactive label: rgba(255,255,255,0.50)
 *
 * The pill position is driven by measuring each segment's layout and animating
 * translateX with withSpring — identical to UISegmentedControl's rubber-band slide.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps) {
  const activeIndex = options.indexOf(value);

  // Measured widths per segment
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  // Animated pill x-position and width
  const pillX = useSharedValue(INNER_PADDING);
  const pillWidth = useSharedValue(0);

  // Track whether initial layout has been measured (no animation on first paint)
  const isFirstLayout = useRef(true);

  // Recompute pill position whenever activeIndex or measurements change
  useEffect(() => {
    if (segmentWidths.length !== options.length) return;

    let xOffset = INNER_PADDING;
    for (let i = 0; i < activeIndex; i++) {
      xOffset += segmentWidths[i] ?? 0;
    }

    const targetWidth = segmentWidths[activeIndex] ?? 0;

    if (isFirstLayout.current) {
      // Snap immediately on first render — no spring animation
      pillX.value = xOffset;
      pillWidth.value = targetWidth;
      isFirstLayout.current = false;
    } else {
      pillX.value = withSpring(xOffset, SPRING_CONFIG);
      pillWidth.value = withSpring(targetWidth, SPRING_CONFIG);
    }
  }, [activeIndex, segmentWidths]);

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
  }));

  const handleSegmentLayout = (index: number, width: number) => {
    setSegmentWidths((prev) => {
      const next = [...prev];
      next[index] = width;
      return next;
    });
  };

  return (
    <View
      style={[styles.shadowWrapper, style]}
      onLayout={(e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
      }}
    >
      {/* Container glass surface */}
      <View style={styles.container}>
        {/* BlurView — frosted glass base */}
        <BlurView
          intensity={40}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
        />

        {/* Subtle overlay tint */}
        <View
          style={[StyleSheet.absoluteFill, styles.containerOverlay]}
          pointerEvents="none"
        />

        {/* 1px top glint */}
        <View style={styles.containerTopGlint} pointerEvents="none" />

        {/* Animated white pill — rendered BEFORE labels so it sits behind text */}
        {containerHeight > 0 && (
          <Animated.View
            style={[
              styles.activePill,
              pillAnimStyle,
              {
                height: containerHeight - INNER_PADDING * 2,
                top: INNER_PADDING,
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.97)', 'rgba(255,255,255,0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 9 }]}
            />
            {/* Top glint on the pill itself */}
            <View style={styles.pillTopGlint} pointerEvents="none" />
          </Animated.View>
        )}

        {/* Segment options */}
        <View style={styles.optionsRow}>
          {options.map((option, index) => {
            const isActive = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={styles.option}
                onLayout={(e: LayoutChangeEvent) => {
                  handleSegmentLayout(index, e.nativeEvent.layout.width);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isActive ? styles.optionTextActive : styles.optionTextInactive,
                  ]}
                  numberOfLines={1}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: 12,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: INNER_PADDING,
    position: 'relative',
  },
  containerOverlay: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  containerTopGlint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    zIndex: 1,
  },
  // Animated sliding pill
  activePill: {
    position: 'absolute',
    borderRadius: 9,
    overflow: 'hidden',
    zIndex: 2,
    // Shadow on the pill for lift
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 5,
    elevation: 4,
  },
  pillTopGlint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    zIndex: 3,
  },
  optionsRow: {
    flexDirection: 'row',
    flex: 1,
    position: 'relative',
    zIndex: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  optionTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  optionTextInactive: {
    color: 'rgba(255,255,255,0.50)',
  },
});

/**
 * PullToRefresh — Custom iOS-native-feeling pull-to-refresh indicator.
 *
 * Usage: wrap your ScrollView with this component. It injects a custom
 * RefreshControl replacement using onScroll + panResponder tracking.
 *
 * Visual: A glowing arc/circle that fills clockwise as you pull down.
 * Once the threshold is reached the circle pulses and the refresh fires.
 */

import React, { useRef, useCallback } from 'react';
import { View, Animated, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

// How far (in px) the user needs to pull before refresh triggers
const PULL_THRESHOLD = 80;
// The distance over which the indicator fully fills (can exceed threshold a bit)
const FILL_DISTANCE = 70;
// The height of the container that slides down to reveal the indicator
const INDICATOR_HEIGHT = 70;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, refreshing, children }: PullToRefreshProps) {
  const scrollY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggered = useRef(false);
  const hasFiredHaptic = useRef(false);

  // 0 → 1 fill progress animated value
  const fillProgress = useRef(new Animated.Value(0)).current;
  // translateY for the indicator container (negative = hidden above)
  const indicatorTranslateY = useRef(new Animated.Value(-INDICATOR_HEIGHT)).current;
  // scale pulse when threshold hit
  const pulseScale = useRef(new Animated.Value(1)).current;
  // opacity of whole indicator
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  const RADIUS = 16;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const resetIndicator = useCallback(() => {
    hasTriggered.current = false;
    hasFiredHaptic.current = false;
    isPulling.current = false;
    Animated.parallel([
      Animated.timing(fillProgress, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(indicatorTranslateY, { toValue: -INDICATOR_HEIGHT, duration: 300, useNativeDriver: true }),
      Animated.timing(indicatorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(pulseScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [fillProgress, indicatorTranslateY, indicatorOpacity, pulseScale]);

  const triggerRefresh = useCallback(async () => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    // Snap to full fill + lock position
    Animated.parallel([
      Animated.timing(fillProgress, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(indicatorTranslateY, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(indicatorOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    // Pulse animation while refreshing
    Animated.loop(
      Animated.sequence([
        Animated.spring(pulseScale, { toValue: 1.15, useNativeDriver: true }),
        Animated.spring(pulseScale, { toValue: 1, useNativeDriver: true }),
      ])
    ).start();

    await onRefresh();

    // Done — hide indicator
    resetIndicator();
  }, [onRefresh, fillProgress, indicatorTranslateY, indicatorOpacity, pulseScale, resetIndicator]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollY.current = y;

      // Only act when scrolled above top (y < 0 means overscroll on iOS)
      if (y < 0) {
        const pull = Math.abs(y);
        isPulling.current = true;

        const progress = Math.min(pull / FILL_DISTANCE, 1);
        fillProgress.setValue(progress);

        // Slide the indicator in as user pulls
        const slideIn = Math.min(pull / PULL_THRESHOLD, 1) * INDICATOR_HEIGHT - INDICATOR_HEIGHT;
        indicatorTranslateY.setValue(slideIn);
        indicatorOpacity.setValue(Math.min(pull / 30, 1));

        // Haptic + trigger at threshold
        if (pull >= PULL_THRESHOLD && !hasFiredHaptic.current) {
          hasFiredHaptic.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else if (isPulling.current && !hasTriggered.current) {
        // User released — check if threshold was met
        if (hasFiredHaptic.current) {
          // Threshold was met before release → trigger
          triggerRefresh();
        } else {
          // Didn't reach threshold → hide
          resetIndicator();
        }
      }
    },
    [fillProgress, indicatorTranslateY, indicatorOpacity, triggerRefresh, resetIndicator]
  );

  // strokeDashoffset drives the fill: 0 = full circle, CIRCUMFERENCE = empty
  const strokeDashoffset = fillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  // Color interpolation: grey → purple/pink as it fills
  const strokeColor = fillProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(120,120,140,0.6)', '#3AE3A0', '#EC4899'],
  });

  // Glow opacity tracks fill
  const glowOpacity = fillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {/* Pull indicator — lives above the scroll content */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 18,
          left: 0,
          right: 0,
          height: INDICATOR_HEIGHT,
          zIndex: 100,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 10,
          transform: [{ translateY: indicatorTranslateY }],
          opacity: indicatorOpacity,
          pointerEvents: 'none',
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: pulseScale }],
          }}
        >
          {/* Glow backdrop */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#3AE3A0',
              opacity: glowOpacity,
              top: -2,
              left: -2,
              // React Native blur via shadow
              shadowColor: '#3AE3A0',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 16,
              elevation: 0,
            }}
          />

          {/* SVG circle indicator */}
          <Svg width={40} height={40} viewBox="0 0 40 40">
            {/* Track circle */}
            <Circle
              cx={20}
              cy={20}
              r={RADIUS}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={2.5}
              fill="none"
            />
            {/* Fill arc — animated */}
            <AnimatedCircle
              cx={20}
              cy={20}
              r={RADIUS}
              stroke={strokeColor as unknown as string}
              strokeWidth={2.5}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset as unknown as number}
              strokeLinecap="round"
              // Start from top (12 o'clock) by rotating -90deg
              transform="rotate(-90, 20, 20)"
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Scroll content */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        // Inject our scroll handler into the ScrollView child
        const existingOnScroll = (child.props as { onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void }).onScroll;
        return React.cloneElement(child as React.ReactElement<{
          onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
          scrollEventThrottle?: number;
          refreshControl?: React.ReactElement | null;
        }>, {
          onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            handleScroll(e);
            existingOnScroll?.(e);
          },
          scrollEventThrottle: 16,
          // Remove native RefreshControl since we handle it
          refreshControl: undefined,
        });
      })}
    </View>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type GroupHighlight, type GroupHighlightItem } from '@/lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_DURATION = 5000;

interface HighlightViewerProps {
  visible: boolean;
  onClose: () => void;
  highlight: GroupHighlight | null;
}

export function HighlightViewer({ visible, onClose, highlight }: HighlightViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const items = highlight?.items ?? [];
  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setImageLoaded(false);
  }, [highlight?.id]);

  useEffect(() => {
    if (!visible || isPaused || !imageLoaded || items.length === 0) {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      return;
    }

    const interval = 50;
    const increment = (interval / ITEM_DURATION) * 100;

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setImageLoaded(false);
            return 0;
          } else {
            handleClose();
            return 0;
          }
        }
        return next;
      });
    }, interval);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    };
  }, [visible, isPaused, imageLoaded, currentIndex, items.length]);

  const handleClose = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT * 0.3, { duration: 200 }, () => {
      runOnJS(onClose)();
      runOnJS(resetState)();
    });
  }, [onClose, opacity, translateY]);

  const resetState = useCallback(() => {
    translateY.value = 0;
    opacity.value = 1;
    setCurrentIndex(0);
    setProgress(0);
    setIsPaused(false);
    setImageLoaded(false);
  }, [translateY, opacity]);

  const goToNext = useCallback(() => {
    Haptics.tap();
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setImageLoaded(false);
    } else {
      handleClose();
    }
  }, [currentIndex, items.length, handleClose]);

  const goToPrev = useCallback(() => {
    Haptics.tap();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setImageLoaded(false);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((event) => {
      if (event.x < SCREEN_WIDTH / 3) {
        runOnJS(goToPrev)();
      } else if (event.x > (SCREEN_WIDTH * 2) / 3) {
        runOnJS(goToNext)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      runOnJS(setIsPaused)(true);
    })
    .onEnd(() => {
      runOnJS(setIsPaused)(false);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = interpolate(
          event.translationY,
          [0, 200],
          [1, 0.5],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withTiming(0);
        opacity.value = withTiming(1);
      }
    });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, tapGesture)
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible || !highlight || !currentItem) {
    return null;
  }

  const imageUrl = api.highlights.getFileUrl(currentItem.storagePath);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.container, containerStyle]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
            />

            {!imageLoaded && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={DS.Color.text} />
              </View>
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={[styles.topOverlay, { paddingTop: insets.top }]}
            >
              <View style={styles.progressContainer}>
                {items.map((_, index) => (
                  <View key={index} style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width:
                            index < currentIndex
                              ? '100%'
                              : index === currentIndex
                              ? `${progress}%`
                              : '0%',
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.highlightTitle}>{highlight.title}</Text>
                  <Text style={styles.itemCount}>
                    {currentIndex + 1} / {items.length}
                  </Text>
                </View>
                <Pressable onPress={handleClose} hitSlop={20}>
                  <X size={28} color={DS.Color.text} />
                </Pressable>
              </View>
            </LinearGradient>

            {currentItem.sourceStory?.uploader && (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}
              >
                <Text style={styles.uploaderName}>
                  Posted by {currentItem.sourceStory.uploader.name}
                </Text>
              </LinearGradient>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: DS.Spacing.sm,
    marginBottom: DS.Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DS.Color.text,
    borderRadius: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
  },
  itemCount: {
    fontSize: 12,
    color: DS.Color.text2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: 40,
  },
  uploaderName: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
  },
});

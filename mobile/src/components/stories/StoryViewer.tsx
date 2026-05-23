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
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flag, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type StoryFeedItem, type ReactionType, type ReactionSummary } from '@/lib/api';
import { ReactionBar } from './ReactionBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface StoryViewerProps {
  visible: boolean;
  onClose: () => void;
  feedItem: StoryFeedItem | null;
  onRequestMixer?: (groupId: string) => void;
  onViewMixer?: (mixerId: string) => void;
  onReport?: (storyId: string) => void;
  isSocialChair?: boolean;
  currentUserId?: string;
  reactionSummaries?: Record<string, ReactionSummary>;
  onReact?: (storyId: string, reaction: ReactionType) => Promise<void>;
}

export function StoryViewer({
  visible,
  onClose,
  feedItem,
  onRequestMixer,
  onViewMixer,
  onReport,
  isSocialChair = false,
  currentUserId,
  reactionSummaries = {},
  onReact,
}: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const stories = feedItem?.stories || [];
  const currentStory = stories[currentIndex];

  // Reset when feedItem changes
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setImageLoaded(false);
  }, [feedItem?.mixerId]);

  // Progress timer
  useEffect(() => {
    if (!visible || isPaused || !imageLoaded || stories.length === 0) {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      return;
    }

    const interval = 50;
    const increment = (interval / STORY_DURATION) * 100;

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          // Move to next story or close
          if (currentIndex < stories.length - 1) {
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
  }, [visible, isPaused, imageLoaded, currentIndex, stories.length]);

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
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setImageLoaded(false);
    } else {
      handleClose();
    }
  }, [currentIndex, stories.length, handleClose]);

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

  // Tap gesture for navigation
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((event) => {
      if (event.x < SCREEN_WIDTH / 3) {
        runOnJS(goToPrev)();
      } else if (event.x > (SCREEN_WIDTH * 2) / 3) {
        runOnJS(goToNext)();
      }
    });

  // Long press to pause
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      runOnJS(setIsPaused)(true);
    })
    .onEnd(() => {
      runOnJS(setIsPaused)(false);
    });

  // Pan gesture to dismiss
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
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
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

  if (!visible || !feedItem || !currentStory) {
    return null;
  }

  const imageUrl = api.stories.getFileUrl(currentStory.storagePath);

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
            {/* Black background */}
            <View style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            </View>

            {/* Story image */}
            <Image
              source={{ uri: imageUrl }}
              style={styles.storyImage}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
            />

            {/* Loading indicator */}
            {!imageLoaded && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={DS.Color.text} />
              </View>
            )}

            {/* Top overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={[styles.topOverlay, { paddingTop: insets.top }]}
            >
              {/* Progress bars */}
              <View style={styles.progressContainer}>
                {stories.map((_, index) => (
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

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {currentStory.uploader?.avatarUrl && (
                    <Image
                      source={{ uri: currentStory.uploader.avatarUrl }}
                      style={styles.avatar}
                    />
                  )}
                  <View>
                    <Text style={styles.uploaderName}>
                      {currentStory.uploader?.name || 'Anonymous'}
                    </Text>
                    <Text style={styles.groupName}>
                      {currentStory.group?.name}
                    </Text>
                  </View>
                </View>

                <Pressable onPress={handleClose} hitSlop={20}>
                  <X size={28} color={DS.Color.text} />
                </Pressable>
              </View>
            </LinearGradient>

            {/* Bottom overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}
            >
              {/* Mixer info */}
              <View style={styles.mixerInfo}>
                <Text style={styles.mixerTitle}>
                  {feedItem.groupAName} × {feedItem.groupBName}
                </Text>
                {feedItem.activityName && (
                  <Text style={styles.activityName}>{feedItem.activityName}</Text>
                )}
              </View>

              {/* Reactions */}
              {onReact && (
                <View style={styles.reactionsRow}>
                  <ReactionBar
                    storyId={currentStory.id}
                    summary={reactionSummaries[currentStory.id] ?? null}
                    onReact={onReact}
                  />
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                {isSocialChair && onRequestMixer && (
                  <Pressable
                    style={styles.requestButton}
                    onPress={() => {
                      Haptics.medium();
                      onRequestMixer(feedItem.mixerId);
                    }}
                  >
                    <LinearGradient
                      colors={DS.Grad.accent.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.requestButtonGradient}
                    >
                      <Text style={styles.requestButtonText}>Request Mixer</Text>
                      <ChevronRight size={18} color={DS.Color.bg} />
                    </LinearGradient>
                  </Pressable>
                )}

                {!isSocialChair && (
                  <View style={styles.notSocialChairHint}>
                    <Text style={styles.hintText}>
                      Ask your social chair to request a mixer
                    </Text>
                  </View>
                )}

                <View style={styles.secondaryActions}>
                  {onViewMixer && (
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        Haptics.tap();
                        onViewMixer(feedItem.mixerId);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>View Mixer</Text>
                    </Pressable>
                  )}

                  {onReport && (
                    <Pressable
                      style={styles.reportButton}
                      onPress={() => {
                        Haptics.tap();
                        onReport(currentStory.id);
                      }}
                    >
                      <Flag size={18} color="rgba(255,255,255,0.6)" />
                    </Pressable>
                  )}
                </View>
              </View>
            </LinearGradient>
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
  storyImage: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text,
  },
  groupName: {
    fontSize: 12,
    color: DS.Color.text2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: 60,
  },
  mixerInfo: {
    marginBottom: DS.Spacing.md,
  },
  reactionsRow: {
    marginBottom: DS.Spacing.md,
  },
  mixerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 4,
  },
  activityName: {
    fontSize: 14,
    color: DS.Color.text2,
  },
  actions: {
    gap: DS.Spacing.md,
  },
  requestButton: {
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.bg,
  },
  notSocialChairHint: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: DS.Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  hintText: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.Spacing.lg,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text,
  },
  reportButton: {
    padding: 10,
  },
});

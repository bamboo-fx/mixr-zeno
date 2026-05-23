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
import { X, Flag, User, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { GlobalStoryFeedItem, GlobalStory, GlobalStoryReactionType } from '@/lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface GlobalStoryViewerProps {
  visible: boolean;
  onClose: () => void;
  feedItem: GlobalStoryFeedItem | null;
  onViewProfile?: (userId: string) => void;
  onReport?: (storyId: string) => void;
  onDelete?: (storyId: string) => Promise<void>;
  currentUserId?: string;
  onReact?: (storyId: string, reaction: GlobalStoryReactionType) => Promise<void>;
}

export function GlobalStoryViewer({
  visible,
  onClose,
  feedItem,
  onViewProfile,
  onReport,
  onDelete,
  currentUserId,
  onReact,
}: GlobalStoryViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const stories = feedItem?.stories || [];
  const currentStory = stories[currentIndex];
  const user = feedItem?.user;

  // Reset when feedItem changes
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setImageLoaded(false);
  }, [feedItem?.user?.id]);

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

  const imageUrl = currentStory.mediaUrl;

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
                <Pressable
                  style={styles.headerLeft}
                  onPress={() => {
                    if (user?.id && onViewProfile) {
                      Haptics.tap();
                      onViewProfile(user.id);
                    }
                  }}
                >
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={20} color={DS.Color.text2} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.uploaderName}>
                      {user?.name || 'Anonymous'}
                    </Text>
                    {currentStory.caption && (
                      <Text style={styles.caption} numberOfLines={1}>
                        {currentStory.caption}
                      </Text>
                    )}
                  </View>
                </Pressable>

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
              {/* Caption (if longer) */}
              {currentStory.caption && currentStory.caption.length > 30 && (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionFull}>{currentStory.caption}</Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                <View style={styles.secondaryActions}>
                  {onViewProfile && user?.id && (
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        Haptics.tap();
                        onViewProfile(user.id);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>View Profile</Text>
                    </Pressable>
                  )}

                  {/* Delete button for own stories */}
                  {onDelete && currentUserId === user?.id && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={async () => {
                        Haptics.tap();
                        setIsDeleting(true);
                        try {
                          await onDelete(currentStory.id);
                          // If there are more stories, go to next; otherwise close
                          if (stories.length > 1) {
                            if (currentIndex < stories.length - 1) {
                              setCurrentIndex(currentIndex);
                              setProgress(0);
                              setImageLoaded(false);
                            } else {
                              setCurrentIndex(Math.max(0, currentIndex - 1));
                              setProgress(0);
                              setImageLoaded(false);
                            }
                          } else {
                            handleClose();
                          }
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FF6B6B" />
                      ) : (
                        <Trash2 size={18} color="#FF6B6B" />
                      )}
                    </Pressable>
                  )}

                  {onReport && currentUserId !== user?.id && (
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
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text,
  },
  caption: {
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
  captionContainer: {
    marginBottom: DS.Spacing.md,
  },
  captionFull: {
    fontSize: 15,
    color: DS.Color.text,
    lineHeight: 22,
  },
  actions: {
    gap: DS.Spacing.md,
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
  deleteButton: {
    padding: 10,
  },
});

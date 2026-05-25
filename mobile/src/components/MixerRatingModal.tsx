import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { X, Star, Send } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

export type RatingTag = 'fun' | 'organized' | 'good-energy' | 'mix-again';

interface MixerRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string, tags?: RatingTag[]) => Promise<void>;
  groupName: string;
  isSubmitting?: boolean;
}

const TAG_OPTIONS: { key: RatingTag; label: string }[] = [
  { key: 'fun',          label: 'Fun' },
  { key: 'organized',    label: 'Organized' },
  { key: 'good-energy',  label: 'Good energy' },
  { key: 'mix-again',    label: 'Would mix again' },
];

const STAR_LABELS = ['', 'Rough', 'Meh', 'Solid', 'Great', 'Legendary'];
const STAR_COLORS = ['', '#EF4444', '#F97316', '#FBBF24', '#22C55E', '#3AE3A0'];

function AnimatedStar({ filled, color, onPress, index }: {
  filled: boolean;
  color: string;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.starButton}>
      <Animated.View style={animStyle}>
        <Star
          size={52}
          color={filled ? color : 'rgba(255,255,255,0.4)'}
          fill={filled ? color : 'transparent'}
          strokeWidth={2}
        />
      </Animated.View>
    </Pressable>
  );
}

export function MixerRatingModal({
  visible,
  onClose,
  onSubmit,
  groupName,
  isSubmitting = false,
}: MixerRatingModalProps) {
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<RatingTag>>(new Set());

  const toggleTag = (t: RatingTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleStarSelect = (value: number) => {
    Haptics.tap();
    setStars(value);
    setError(null);
  };

  const handleSubmit = async () => {
    if (stars === null) {
      setError('Please select a rating');
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 50 }),
        withSpring(1)
      );
      Haptics.error();
      return;
    }

    // Map 1-5 stars to 0-10 backend scale
    const backendRating = stars * 2;

    try {
      await onSubmit(backendRating, comment.trim() || undefined, Array.from(selectedTags));
      Haptics.success();
      setStars(null);
      setComment('');
      setError(null);
      onClose();
    } catch (err) {
      setError('Failed to submit rating');
      Haptics.error();
    }
  };

  const handleClose = () => {
    Haptics.tap();
    setStars(null);
    setComment('');
    setError(null);
    onClose();
  };

  const activeColor = stars !== null ? STAR_COLORS[stars] : DS.Color.text2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <LinearGradient
            colors={[DS.Color.bg, 'rgba(10, 15, 26, 0.98)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Star size={22} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.headerTitle}>Rate Your Experience</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={DS.Color.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Group name */}
            <Text style={styles.groupLabel}>How was your mixer with</Text>
            <Text style={styles.groupName}>{groupName}?</Text>

            {/* Star rating */}
            <View style={styles.starsSection}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <AnimatedStar
                    key={value}
                    index={value}
                    filled={stars !== null && value <= stars}
                    color={activeColor}
                    onPress={() => handleStarSelect(value)}
                  />
                ))}
              </View>

              <View style={styles.labelContainer}>
                {stars !== null ? (
                  <Text style={[styles.ratingLabel, { color: activeColor }]}>
                    {STAR_LABELS[stars]}
                  </Text>
                ) : (
                  <Text style={styles.ratingPlaceholder}>Tap to rate</Text>
                )}
              </View>
            </View>

            {/* Tag chips */}
            <View style={[styles.commentSection, { gap: 8 }]}>
              <Text style={styles.sectionLabel}>What stood out? (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TAG_OPTIONS.map((t) => {
                  const active = selectedTags.has(t.key);
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => toggleTag(t.key)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1,
                        backgroundColor: active ? '#FFFFFF' : 'transparent',
                        borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.20)',
                      }}
                    >
                      <Text style={{
                        color: active ? '#000' : '#fff',
                        fontSize: 13,
                        fontWeight: '600',
                        letterSpacing: -0.1,
                      }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Comment input */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionLabel}>Add a comment (optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="What made this mixer memorable?"
                placeholderTextColor={DS.Color.text2}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>

            {/* Error message */}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          {/* Submit button */}
          <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              onPressIn={() => { buttonScale.value = withSpring(0.97); }}
              onPressOut={() => { buttonScale.value = withSpring(1); }}
            >
              <Animated.View style={buttonStyle}>
                <LinearGradient
                  colors={stars !== null ? [activeColor, activeColor] : DS.Grad.accent.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  <Send size={18} color={DS.Color.bg} />
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.Color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.Color.text,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: DS.Spacing.lg,
  },
  groupLabel: {
    fontSize: 16,
    color: DS.Color.text2,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.Color.text,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: DS.Spacing.xl,
  },
  starsSection: {
    alignItems: 'center',
    marginBottom: DS.Spacing.xl,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: DS.Spacing.md,
  },
  starButton: {
    padding: 4,
  },
  labelContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ratingPlaceholder: {
    fontSize: 15,
    color: DS.Color.text3,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text2,
    marginBottom: DS.Spacing.md,
  },
  commentSection: {
    marginBottom: DS.Spacing.lg,
  },
  commentInput: {
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    padding: DS.Spacing.md,
    fontSize: 16,
    color: DS.Color.text,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: DS.Color.text2,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.md,
    backgroundColor: DS.Color.bg,
    borderTopWidth: 1,
    borderTopColor: DS.Color.stroke,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: DS.Radius.md,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.bg,
  },
});

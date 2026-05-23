import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  X,
  RotateCcw,
  Trash2,
  Check,
  Sparkles,
  FlipHorizontal2,
  CheckCircle,
} from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type PostableMixer, type MixerStory } from '@/lib/api';

interface StoryCameraModalProps {
  visible: boolean;
  onClose: () => void;
  postableMixers: PostableMixer[];
  userId: string;
  onStoryPosted: (story: MixerStory) => void;
}

type ViewState = 'camera' | 'preview' | 'uploading' | 'select_mixer';

export function StoryCameraModal({
  visible,
  onClose,
  postableMixers,
  userId,
  onStoryPosted,
}: StoryCameraModalProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [viewState, setViewState] = useState<ViewState>('camera');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [capturedPhoto, setCapturedPhoto] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [selectedMixer, setSelectedMixer] = useState<PostableMixer | null>(
    postableMixers.length === 1 ? postableMixers[0] : null
  );
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const shutterScale = useSharedValue(1);

  const resetState = useCallback(() => {
    setViewState('camera');
    setCapturedPhoto(null);
    setSelectedMixer(postableMixers.length === 1 ? postableMixers[0] : null);
    setCaption('');
    setIsUploading(false);
  }, [postableMixers]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    Haptics.heavy();

    // Animate shutter
    shutterScale.value = withSequence(
      withTiming(0.85, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo) {
        setCapturedPhoto({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });

        if (postableMixers.length === 1) {
          setViewState('preview');
        } else {
          setViewState('select_mixer');
        }
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Haptics.error();
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  }, [postableMixers, shutterScale]);

  const flipCamera = useCallback(() => {
    Haptics.tap();
    setCameraType((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const retakePhoto = useCallback(() => {
    Haptics.tap();
    setCapturedPhoto(null);
    setCaption('');
    setViewState('camera');
  }, []);

  const uploadStory = useCallback(async () => {
    if (!capturedPhoto || !selectedMixer) return;

    setIsUploading(true);
    setViewState('uploading');

    try {
      const result = await api.stories.upload({
        file: {
          uri: capturedPhoto.uri,
          type: 'image/jpeg',
          name: `story_${Date.now()}.jpg`,
        },
        mixerId: selectedMixer.mixerId,
        uploaderId: userId,
        groupId: selectedMixer.groupId,
        width: capturedPhoto.width,
        height: capturedPhoto.height,
        caption: caption.trim() || undefined,
      });

      Haptics.success();
      onStoryPosted(result.story);
      handleClose();
    } catch (error: unknown) {
      console.error('Failed to upload story:', error);
      Haptics.error();
      setViewState('preview');
      setIsUploading(false);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload story';

      if (errorMessage.includes('posting window') || errorMessage.includes('2AM')) {
        Alert.alert(
          'Posting Window Closed',
          'Stories can only be posted while the mixer is live (until 2AM).'
        );
      } else if (errorMessage.includes('already posted')) {
        Alert.alert(
          'Already Posted',
          'Your group has already posted a story for this mixer.'
        );
      } else {
        Alert.alert('Upload Failed', errorMessage);
      }
    }
  }, [capturedPhoto, selectedMixer, userId, caption, onStoryPosted, handleClose]);

  const selectMixerAndContinue = useCallback((mixer: PostableMixer) => {
    Haptics.tap();
    setSelectedMixer(mixer);
    setViewState('preview');
  }, []);

  const shutterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  // Request permission if needed
  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to let you share stories with your mixer.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Camera View */}
        {viewState === 'camera' && (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={cameraType}
            />

            {/* Top controls */}
            <View style={[styles.topBar, { paddingTop: insets.top + DS.Spacing.sm }]}>
              <Pressable onPress={handleClose} hitSlop={20}>
                <X size={28} color={DS.Color.text} />
              </Pressable>

              <Pressable onPress={flipCamera} style={styles.flipButton}>
                <FlipHorizontal2 size={24} color={DS.Color.text} />
              </Pressable>
            </View>

            {/* Bottom controls */}
            <View
              style={[styles.bottomBar, { paddingBottom: insets.bottom + DS.Spacing.xl }]}
            >
              {/* Shutter button */}
              <Pressable onPress={takePicture}>
                <Animated.View style={[styles.shutterOuter, shutterAnimatedStyle]}>
                  <LinearGradient
                    colors={DS.Grad.accent.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shutterGradient}
                  >
                    <View style={styles.shutterInner} />
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>

            {/* Hint text */}
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                {selectedMixer
                  ? selectedMixer.hasPosted
                    ? `${selectedMixer.groupName} — already posted`
                    : `Posting for: ${selectedMixer.groupName}`
                  : 'Select mixer after photo'}
              </Text>
            </View>
          </>
        )}

        {/* Mixer selection */}
        {viewState === 'select_mixer' && (
          <View style={[styles.selectMixerContainer, { paddingTop: insets.top }]}>
            <View style={styles.selectMixerHeader}>
              <Pressable onPress={retakePhoto}>
                <X size={28} color={DS.Color.text} />
              </Pressable>
              <Text style={styles.selectMixerTitle}>Select Mixer</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.mixerList}>
              {postableMixers.map((mixer) => (
                <Pressable
                  key={mixer.mixerId}
                  style={[
                    styles.mixerOption,
                    mixer.hasPosted && styles.mixerOptionDisabled,
                  ]}
                  onPress={() => !mixer.hasPosted && selectMixerAndContinue(mixer)}
                  disabled={mixer.hasPosted}
                >
                  <View style={styles.mixerOptionContent}>
                    {mixer.hasPosted ? (
                      <CheckCircle size={20} color="#22C55E" />
                    ) : (
                      <Sparkles size={20} color={DS.Grad.accent.colors[0]} />
                    )}
                    <Text style={[styles.mixerOptionText, mixer.hasPosted && styles.mixerOptionTextDimmed]}>
                      {mixer.groupName}
                    </Text>
                    {mixer.hasPosted && (
                      <Text style={styles.postedBadge}>Posted</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Preview */}
        {(viewState === 'preview' || viewState === 'uploading') && capturedPhoto && (
          <KeyboardAvoidingView
            style={styles.previewContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Image
              source={{ uri: capturedPhoto.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />

            {/* Dark scrim at bottom for caption */}
            <View style={styles.bottomScrim} pointerEvents="none" />

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + DS.Spacing.sm }]}>
              <Pressable
                onPress={retakePhoto}
                disabled={isUploading}
                style={{ opacity: isUploading ? 0.5 : 1 }}
              >
                <RotateCcw size={28} color={DS.Color.text} />
              </Pressable>

              <Pressable
                onPress={handleClose}
                disabled={isUploading}
                style={{ opacity: isUploading ? 0.5 : 1 }}
              >
                <X size={28} color={DS.Color.text} />
              </Pressable>
            </View>

            {/* Caption + actions at bottom */}
            <View
              style={[
                styles.previewBottomBar,
                { paddingBottom: insets.bottom + DS.Spacing.lg },
              ]}
            >
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color={DS.Color.text} />
                  <Text style={styles.uploadingText}>Posting story...</Text>
                </View>
              ) : (
                <>
                  {/* Caption input */}
                  <TextInput
                    style={styles.captionInput}
                    placeholder="Add a caption... (optional)"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={200}
                    returnKeyType="done"
                    blurOnSubmit
                  />

                  {/* Action row */}
                  <View style={styles.actionRow}>
                    <Pressable onPress={retakePhoto} style={styles.deleteButton}>
                      <Trash2 size={24} color={DS.Color.text} />
                    </Pressable>

                    <Pressable onPress={uploadStory} style={styles.postButton}>
                      <LinearGradient
                        colors={DS.Grad.accent.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.postButtonGradient}
                      >
                        <Text style={styles.postButtonText}>Post Story</Text>
                        <Check size={20} color={DS.Color.bg} />
                      </LinearGradient>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Mixer label */}
            {selectedMixer && !isUploading && (
              <View style={styles.mixerLabel}>
                <Sparkles size={14} color={DS.Grad.accent.colors[0]} />
                <Text style={styles.mixerLabelText}>{selectedMixer.groupName}</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: DS.Color.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.Spacing.xl,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: DS.Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: DS.Color.text2,
    textAlign: 'center',
    marginBottom: DS.Spacing.xl,
  },
  permissionButton: {
    backgroundColor: DS.Grad.accent.colors[0],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: DS.Radius.md,
    marginBottom: DS.Spacing.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.bg,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    fontSize: 16,
    color: DS.Color.text2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    zIndex: 10,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: DS.Spacing.xl,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 4,
  },
  shutterGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DS.Color.text,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: DS.Color.text2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: DS.Radius.sm,
  },
  selectMixerContainer: {
    flex: 1,
    backgroundColor: DS.Color.bg,
  },
  selectMixerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  selectMixerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.Color.text,
  },
  mixerList: {
    padding: DS.Spacing.lg,
    gap: DS.Spacing.md,
  },
  mixerOption: {
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    padding: DS.Spacing.lg,
  },
  mixerOptionDisabled: {
    opacity: 0.5,
  },
  mixerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.md,
  },
  mixerOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
    flex: 1,
  },
  mixerOptionTextDimmed: {
    color: DS.Color.text2,
  },
  postedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  previewContainer: {
    flex: 1,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.md,
    gap: DS.Spacing.md,
  },
  captionInput: {
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: DS.Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxHeight: 80,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.Spacing.xl,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 28,
  },
  postButton: {
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
    flex: 1,
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.bg,
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: DS.Spacing.md,
    paddingVertical: DS.Spacing.xl,
  },
  uploadingText: {
    fontSize: 16,
    color: DS.Color.text,
  },
  mixerLabel: {
    position: 'absolute',
    top: '45%',
    left: DS.Spacing.lg,
    right: DS.Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: DS.Radius.md,
    alignSelf: 'center',
  },
  mixerLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
});

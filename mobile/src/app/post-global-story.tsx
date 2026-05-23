import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
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
  FlipHorizontal2,
  Camera,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground } from '@/components/gel';

type ViewState = 'camera' | 'preview' | 'uploading';

export default function PostGlobalStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [viewState, setViewState] = useState<ViewState>('camera');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [capturedPhoto, setCapturedPhoto] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const shutterScale = useSharedValue(1);

  const resetState = useCallback(() => {
    setViewState('camera');
    setCapturedPhoto(null);
    setCaption('');
    setIsUploading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    router.back();
  }, [router, resetState]);

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
        setViewState('preview');
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Haptics.error();
    }
  }, [shutterScale]);

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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!capturedPhoto || !profile?.id || !profile?.collegeId) {
        throw new Error('Missing required data');
      }

      return api.globalStories.upload({
        collegeId: profile.collegeId,
        uploaderId: profile.id,
        file: {
          uri: capturedPhoto.uri,
          type: 'image/jpeg',
          name: `global_story_${Date.now()}.jpg`,
        },
        caption: caption.trim() || undefined,
      });
    },
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['global-stories-feed'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to upload story:', error);
      Haptics.error();
      setViewState('preview');
      setIsUploading(false);
    },
  });

  const { mutate: uploadMutate } = uploadMutation;

  const uploadStory = useCallback(() => {
    if (!capturedPhoto) return;
    setIsUploading(true);
    setViewState('uploading');
    uploadMutate();
  }, [capturedPhoto, uploadMutate]);

  const shutterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  // Request permission if needed
  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <GelBackground>
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <View style={styles.iconCircle}>
            <Camera size={40} color={DS.Color.text2} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to let you share stories with your campus.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <LinearGradient
              colors={DS.Grad.accent.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Access</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </GelBackground>
    );
  }

  return (
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
              Share a moment with your campus
            </Text>
          </View>
        </>
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

          {/* Caption input */}
          {!isUploading && (
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Bottom actions */}
          <View
            style={[
              styles.previewBottomBar,
              { paddingBottom: insets.bottom + DS.Spacing.xl },
            ]}
          >
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={DS.Color.text} />
                <Text style={styles.uploadingText}>Posting story...</Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DS.Color.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.lg,
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
    lineHeight: 22,
  },
  permissionButton: {
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
    marginBottom: DS.Spacing.md,
  },
  permissionButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.bg,
    textAlign: 'center',
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
  previewContainer: {
    flex: 1,
  },
  captionContainer: {
    position: 'absolute',
    top: '45%',
    left: DS.Spacing.lg,
    right: DS.Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: DS.Radius.md,
    padding: DS.Spacing.md,
  },
  captionInput: {
    fontSize: 16,
    color: DS.Color.text,
    minHeight: 40,
    maxHeight: 80,
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.Spacing.xl,
    paddingTop: DS.Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 28,
  },
  postButton: {
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
  },
  uploadingText: {
    fontSize: 16,
    color: DS.Color.text,
  },
});

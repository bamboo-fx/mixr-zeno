import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { StoryCameraModal } from '@/components/stories/StoryCameraModal';
import { GelBackground } from '@/components/gel';

export default function PostStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [cameraOpen, setCameraOpen] = useState(false);

  const { data: canPostData, isLoading } = useQuery({
    queryKey: ['can-post', profile?.id],
    queryFn: () => api.stories.canPost(profile!.id),
    enabled: !!profile?.id,
  });

  // Auto-open camera if user can post
  useEffect(() => {
    if (canPostData?.canPost && canPostData.postableMixers.length > 0) {
      setCameraOpen(true);
    }
  }, [canPostData]);

  const handleClose = () => {
    router.back();
  };

  const handleStoryPosted = () => {
    queryClient.invalidateQueries({ queryKey: ['stories-feed'] });
    router.back();
  };

  if (isLoading) {
    return (
      <GelBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={DS.Color.gelPurple} />
            <Text style={styles.loadingText}>Checking posting status...</Text>
          </View>
        </View>
      </GelBackground>
    );
  }

  if (!canPostData?.canPost || canPostData.postableMixers.length === 0) {
    return (
      <GelBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={20}>
              <X size={28} color={DS.Color.text} />
            </Pressable>
          </View>

          <View style={styles.noMixerContainer}>
            <View style={styles.iconCircle}>
              <Camera size={40} color={DS.Color.text2} />
            </View>
            <Text style={styles.noMixerTitle}>No Active Mixers</Text>
            <Text style={styles.noMixerText}>
              You can only post stories while participating in a live mixer.
              Stories can be posted from mixer start until 2 AM.
            </Text>
            <Pressable style={styles.backButton} onPress={handleClose}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </GelBackground>
    );
  }

  return (
    <>
      <GelBackground>
        <View style={[styles.container, { paddingTop: insets.top }]} />
      </GelBackground>

      <StoryCameraModal
        visible={cameraOpen}
        onClose={handleClose}
        postableMixers={canPostData.postableMixers}
        userId={profile?.id ?? ''}
        onStoryPosted={handleStoryPosted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: DS.Color.text2,
  },
  noMixerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.Spacing.xl,
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
  noMixerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: DS.Spacing.sm,
    textAlign: 'center',
  },
  noMixerText: {
    fontSize: 15,
    color: DS.Color.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: DS.Spacing.xl,
  },
  backButton: {
    backgroundColor: DS.Color.glass,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: DS.Radius.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
  },
});

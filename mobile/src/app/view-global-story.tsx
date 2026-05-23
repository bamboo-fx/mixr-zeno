import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { GlobalStoryViewer } from '@/components/stories/GlobalStoryViewer';
import type { GlobalStoryReactionType } from '@/lib/types';

export default function ViewGlobalStoryScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [viewerVisible, setViewerVisible] = useState(true);
  // Track if we're navigating to profile to prevent double back
  const navigatingToProfileRef = useRef(false);

  // Fetch global stories feed to find the user's stories
  const { data: feedData, isLoading } = useQuery({
    queryKey: ['global-stories-feed', profile?.collegeId, profile?.id],
    queryFn: () => api.globalStories.getFeed(profile!.collegeId!, profile?.id),
    enabled: !!profile?.collegeId,
  });

  // Find the feed item for this user
  const feedItem = feedData?.feed?.find((item) => item.user?.id === userId) ?? null;

  // React mutation
  const reactMutation = useMutation({
    mutationFn: ({ storyId, reaction }: { storyId: string; reaction: GlobalStoryReactionType }) =>
      api.globalStories.react(storyId, profile!.id, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-stories-feed'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (storyId: string) => api.globalStories.delete(storyId, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-stories-feed'] });
    },
  });

  const { mutateAsync: reactMutateAsync } = reactMutation;
  const { mutateAsync: deleteMutateAsync } = deleteMutation;

  const handleReact = useCallback(
    async (storyId: string, reaction: GlobalStoryReactionType) => {
      if (!profile?.id) return;
      await reactMutateAsync({ storyId, reaction });
    },
    [profile?.id, reactMutateAsync]
  );

  const handleDelete = useCallback(
    async (storyId: string) => {
      if (!profile?.id) return;
      await deleteMutateAsync(storyId);
    },
    [profile?.id, deleteMutateAsync]
  );

  const handleClose = useCallback(() => {
    // Don't navigate back if we're going to profile
    if (navigatingToProfileRef.current) {
      navigatingToProfileRef.current = false;
      return;
    }
    setViewerVisible(false);
    // Check if we can go back, otherwise navigate to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)');
    }
  }, [router]);

  const handleViewProfile = useCallback(
    (targetUserId: string) => {
      // Mark that we're navigating to profile
      navigatingToProfileRef.current = true;
      setViewerVisible(false);
      // Navigate to profile - dismiss current and push profile
      if (router.canGoBack()) {
        router.back();
      }
      // Use setTimeout to ensure the back navigation completes before pushing
      setTimeout(() => {
        router.push(`/profile/${targetUserId}`);
      }, 100);
    },
    [router]
  );

  const handleReport = useCallback(
    (storyId: string) => {
      // Could navigate to a report modal or handle inline
      console.log('Report story:', storyId);
    },
    []
  );

  if (isLoading || !feedItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DS.Color.gelPurple} />
      </View>
    );
  }

  return (
    <GlobalStoryViewer
      visible={viewerVisible}
      onClose={handleClose}
      feedItem={feedItem}
      onViewProfile={handleViewProfile}
      onReport={handleReport}
      currentUserId={profile?.id}
      onReact={handleReact}
      onDelete={handleDelete}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

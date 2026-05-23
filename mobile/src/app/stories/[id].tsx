import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ReactionType, type ReactionSummary } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { StoryViewer } from '@/components/stories/StoryViewer';

export default function StoriesViewerScreen() {
  const { id: mixerId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [viewerVisible, setViewerVisible] = useState(true);

  // Fetch story feed to get the feed item for this mixer
  const { data: feed, isLoading } = useQuery({
    queryKey: ['stories-feed', profile?.collegeId, profile?.id],
    queryFn: () => api.stories.getFeed(profile!.collegeId!, profile?.id),
    enabled: !!profile?.collegeId,
  });

  // Find the feed item for this mixer
  const feedItem = feed?.find((item) => item.mixerId === mixerId) ?? null;

  // Fetch reactions for this mixer's stories
  const { data: reactionsData } = useQuery({
    queryKey: ['mixer-reactions', mixerId, profile?.id],
    queryFn: () => api.reactions.getMixerReactions(mixerId!, profile?.id),
    enabled: !!mixerId && !!profile?.id,
  });

  // Convert reaction data to summary format
  const reactionSummaries: Record<string, ReactionSummary> = {};
  if (reactionsData?.summaryByStory) {
    Object.entries(reactionsData.summaryByStory).forEach(([storyId, data]) => {
      const counts = data.counts as Record<string, number>;
      reactionSummaries[storyId] = {
        counts: {
          fire: counts.fire ?? 0,
          party: counts.party ?? 0,
          love: counts.love ?? 0,
        },
        total: (counts.fire ?? 0) + (counts.party ?? 0) + (counts.love ?? 0),
        userReactions: data.userReactions as ReactionType[],
      };
    });
  }

  // Check if user is a social chair of any group
  const isSocialChair = profile?.groupMemberships?.some(
    (m) => m.role === 'social_chair' || m.role === 'admin'
  ) ?? false;

  // React mutation
  const reactMutation = useMutation({
    mutationFn: ({ storyId, reaction }: { storyId: string; reaction: ReactionType }) =>
      api.reactions.toggle(storyId, profile!.id, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-reactions', mixerId] });
    },
  });

  const { mutateAsync: reactMutateAsync } = reactMutation;

  const handleReact = useCallback(
    async (storyId: string, reaction: ReactionType) => {
      if (!profile?.id) return;
      await reactMutateAsync({ storyId, reaction });
    },
    [profile?.id, reactMutateAsync]
  );

  const handleClose = useCallback(() => {
    setViewerVisible(false);
    router.back();
  }, [router]);

  const handleRequestMixer = useCallback(
    (groupId: string) => {
      // Navigate to send mixer request screen
      router.push(`/send-mixer-request?targetGroupId=${groupId}`);
    },
    [router]
  );

  const handleViewMixer = useCallback(
    (mixId: string) => {
      router.push(`/mixer/${mixId}`);
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
    <StoryViewer
      visible={viewerVisible}
      onClose={handleClose}
      feedItem={feedItem}
      onRequestMixer={handleRequestMixer}
      onViewMixer={handleViewMixer}
      onReport={handleReport}
      isSocialChair={isSocialChair}
      currentUserId={profile?.id}
      reactionSummaries={reactionSummaries}
      onReact={handleReact}
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

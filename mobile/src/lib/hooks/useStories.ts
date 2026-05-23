import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type StoryFeedItem, type MixerStory, type PostableMixer } from '@/lib/api';

const SEEN_STORIES_KEY = '@mixr_seen_stories';

export function useStories(collegeId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const [seenMixerIds, setSeenMixerIds] = useState<Set<string>>(new Set());

  // Load seen stories from storage
  useEffect(() => {
    const loadSeenStories = async () => {
      try {
        const stored = await AsyncStorage.getItem(SEEN_STORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { mixerId: string; seenAt: number }[];
          // Filter out entries older than 24 hours
          const now = Date.now();
          const valid = parsed.filter((s) => now - s.seenAt < 24 * 60 * 60 * 1000);
          setSeenMixerIds(new Set(valid.map((s) => s.mixerId)));
        }
      } catch (error) {
        console.error('Failed to load seen stories:', error);
      }
    };
    loadSeenStories();
  }, []);

  // Fetch story feed
  const {
    data: feed = [],
    isLoading: feedLoading,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ['story-feed', collegeId, userId],
    queryFn: () => api.stories.getFeed(collegeId!, userId),
    enabled: !!collegeId,
    staleTime: 30000, // 30 seconds
  });

  // Fetch postable mixers for the user
  const {
    data: canPostData,
    isLoading: canPostLoading,
    refetch: refetchCanPost,
  } = useQuery({
    queryKey: ['can-post-stories', userId],
    queryFn: () => api.stories.canPost(userId!),
    enabled: !!userId,
    staleTime: 30000,
  });

  // Mark mixer as seen
  const markAsSeen = useCallback(async (mixerId: string) => {
    setSeenMixerIds((prev) => {
      const next = new Set(prev);
      next.add(mixerId);
      return next;
    });

    try {
      const stored = await AsyncStorage.getItem(SEEN_STORIES_KEY);
      const parsed = stored ? (JSON.parse(stored) as { mixerId: string; seenAt: number }[]) : [];

      // Remove old entry if exists
      const filtered = parsed.filter((s) => s.mixerId !== mixerId);
      filtered.push({ mixerId, seenAt: Date.now() });

      await AsyncStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to save seen story:', error);
    }
  }, []);

  // Upload story mutation
  const uploadStoryMutation = useMutation({
    mutationFn: api.stories.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-feed'] });
      refetchFeed();
    },
  });

  // Delete story mutation
  const deleteStoryMutation = useMutation({
    mutationFn: ({ storyId, userId }: { storyId: string; userId: string }) =>
      api.stories.delete(storyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-feed'] });
      refetchFeed();
    },
  });

  // Handler when story is posted
  const onStoryPosted = useCallback(
    (story: MixerStory) => {
      // Optimistically add to feed
      queryClient.setQueryData(
        ['story-feed', collegeId, userId],
        (old: StoryFeedItem[] | undefined) => {
          if (!old) return old;

          const existingIndex = old.findIndex((f) => f.mixerId === story.mixerId);
          if (existingIndex >= 0) {
            // Update existing mixer stories
            const updated = [...old];
            const existing = updated[existingIndex];
            if (existing) {
              updated[existingIndex] = {
                ...existing,
                storyCount: existing.storyCount + 1,
                latestCreatedAt: story.createdAt,
                stories: [...existing.stories, story],
              };
            }
            return updated;
          }
          return old;
        }
      );
      refetchFeed();
    },
    [collegeId, userId, queryClient, refetchFeed]
  );

  return {
    feed,
    feedLoading,
    refetchFeed,
    seenMixerIds,
    markAsSeen,
    canPost: canPostData?.canPost ?? false,
    postableMixers: canPostData?.postableMixers ?? [],
    canPostLoading,
    refetchCanPost,
    uploadStory: uploadStoryMutation.mutateAsync,
    deleteStory: deleteStoryMutation.mutateAsync,
    onStoryPosted,
    isUploading: uploadStoryMutation.isPending,
  };
}

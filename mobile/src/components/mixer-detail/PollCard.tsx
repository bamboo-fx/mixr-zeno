import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { api, type MixerVotesResponse, type VoteOption } from '@/lib/api';
import { colors as C, fonts as F } from '@/lib/theme';

type Kind = 'theme' | 'activity';

type Props = {
  mixerId: string;
  userId: string | undefined;
  kind: Kind;
  title: string;          // "Pick the theme"
  metaRight?: string;     // "Closes 6 PM"
};

export function PollCard({ mixerId, userId, kind, title, metaRight }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['mixer-votes', mixerId, userId],
    queryFn: () => api.mixerVotes.get(mixerId, userId),
    enabled: !!mixerId,
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: async (vars: { optionId: string; willUnvote: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (vars.willUnvote) {
        return api.mixerVotes.remove(mixerId, userId, kind);
      }
      return api.mixerVotes.cast(mixerId, { userId, kind, optionId: vars.optionId });
    },
    onMutate: async (vars) => {
      // Optimistic update — swap or remove without waiting for the server.
      await queryClient.cancelQueries({ queryKey: ['mixer-votes', mixerId, userId] });
      const previous = queryClient.getQueryData<MixerVotesResponse>(['mixer-votes', mixerId, userId]);
      if (!previous) return { previous };

      const next: MixerVotesResponse = JSON.parse(JSON.stringify(previous));
      const slice = next[kind];
      const oldVote = slice.myVote;

      if (oldVote) {
        const oldOpt = slice.options.find((o) => o.id === oldVote);
        if (oldOpt) oldOpt.votes = Math.max(0, oldOpt.votes - 1);
        slice.totalVotes = Math.max(0, slice.totalVotes - 1);
      }
      if (!vars.willUnvote) {
        const newOpt = slice.options.find((o) => o.id === vars.optionId);
        if (newOpt) newOpt.votes += 1;
        slice.myVote = vars.optionId;
        slice.totalVotes += 1;
      } else {
        slice.myVote = null;
      }
      queryClient.setQueryData(['mixer-votes', mixerId, userId], next);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['mixer-votes', mixerId, userId], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-votes', mixerId, userId] });
    },
  });

  const slice = data?.[kind];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {metaRight && <Text style={styles.sectionMeta}>{metaRight}</Text>}
      </View>

      <View style={styles.card}>
        {isLoading || !slice ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={C.ink2} size="small" />
          </View>
        ) : (
          slice.options.map((opt, idx) => (
            <Row
              key={opt.id}
              option={opt}
              isVoted={slice.myVote === opt.id}
              showTopBorder={idx > 0}
              disabled={!userId || mutation.isPending}
              onPress={() => {
                const willUnvote = slice.myVote === opt.id;
                mutation.mutate({ optionId: opt.id, willUnvote });
              }}
            />
          ))
        )}
      </View>
    </View>
  );
}

function Row({
  option,
  isVoted,
  showTopBorder,
  disabled,
  onPress,
}: {
  option: VoteOption;
  isVoted: boolean;
  showTopBorder: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // Spring the check + crest scale when the voted state flips
  const progress = useSharedValue(isVoted ? 1 : 0);
  React.useEffect(() => {
    progress.value = withSpring(isVoted ? 1 : 0, { damping: 11, stiffness: 200 });
  }, [isVoted, progress]);

  const crestStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.04 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.7 }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));
  const numColorStyle = useAnimatedStyle(() => ({
    // Animate crimson when voted (interpolate not strictly needed; toggle by progress)
    color: progress.value > 0.5 ? C.crimson : C.ink,
  }));

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.row,
        showTopBorder && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
      android_ripple={{ color: C.surface3 }}
    >
      {/* Left stripe */}
      <View style={[styles.stripe, isVoted && styles.stripeVoted]} />

      {/* Crest */}
      <Animated.View style={[styles.crest, isVoted && styles.crestVoted, crestStyle]}>
        <Animated.Text style={[styles.crestEmoji, emojiStyle]}>{option.emoji}</Animated.Text>
        <Animated.View style={[styles.crestCheck, checkStyle]} pointerEvents="none">
          <Check size={22} color={C.ink} strokeWidth={3} />
        </Animated.View>
      </Animated.View>

      {/* Middle */}
      <View style={styles.middle}>
        <Text style={styles.rowName} numberOfLines={1}>{option.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{option.subtitle}</Text>
      </View>

      {/* Right */}
      <View style={styles.right}>
        <Animated.Text style={[styles.num, numColorStyle]}>{option.votes}</Animated.Text>
        <Text style={[styles.label, isVoted && styles.labelVoted]}>
          {isVoted ? 'your vote' : 'votes'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 4,
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: F.bold,
    color: C.ink,
    fontSize: 22,
    letterSpacing: -0.55,
  },
  sectionMeta: {
    fontFamily: F.medium,
    color: C.ink,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
    overflow: 'hidden',
  },

  loadingRow: {
    paddingVertical: 28,
    alignItems: 'center',
  },

  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  rowPressed: {
    backgroundColor: C.surface3,
  },

  stripe: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 3,
    backgroundColor: 'transparent',
  },
  stripeVoted: {
    backgroundColor: C.crimson,
  },

  crest: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crestVoted: {
    backgroundColor: C.crimson,
    shadowColor: C.crimson,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  crestEmoji: {
    fontSize: 24,
    ...({} as object),
  },
  crestCheck: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  middle: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: C.ink,
    fontFamily: F.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  rowSub: {
    color: C.ink3,
    fontFamily: F.medium,
    fontSize: 12,
    letterSpacing: -0.05,
  },

  right: {
    alignItems: 'flex-end',
  },
  num: {
    fontFamily: F.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: C.ink3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  labelVoted: {
    color: C.crimson,
  },
});

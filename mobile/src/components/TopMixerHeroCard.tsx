import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Trophy, Sparkles, ChevronRight } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { WeeklyMixerRanking } from '@/lib/api';

// Default group logo
const DEFAULT_GROUP_LOGO = require('../../assets/images/default-group-logo.png');

interface TopMixerHeroCardProps {
  topMixer: WeeklyMixerRanking | null;
  onPress?: () => void;
  onViewLeaderboard?: () => void;
  isLoading?: boolean;
}

export function TopMixerHeroCard({
  topMixer,
  onPress,
  onViewLeaderboard,
  isLoading = false,
}: TopMixerHeroCardProps) {
  const scale = useSharedValue(1);
  const shimmerOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (topMixer) {
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [topMixer, shimmerOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.tap();
    onPress?.();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
      </View>
    );
  }

  if (!topMixer) {
    return null;
  }

  const mixer = topMixer.mixer;
  const groupAName = mixer.groupA?.name ?? 'Group A';
  const groupBName = mixer.groupB?.name ?? 'Group B';
  const activityName = mixer.activity?.name;

  // Calculate chemistry score (normalized 0-100)
  const maxPossibleScore = 50; // Rough estimate
  const chemistryScore = Math.min(100, Math.round((topMixer.score / maxPossibleScore) * 100));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 140, 0, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 215, 0, 0.2)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.trophyBadge}>
                <Trophy size={16} color="#FFD700" />
              </View>
              <Text style={styles.headerTitle}>Top Mixer of the Week</Text>
            </View>
            {onViewLeaderboard && (
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  onViewLeaderboard();
                }}
                style={styles.leaderboardButton}
              >
                <Text style={styles.leaderboardText}>Leaderboard</Text>
                <ChevronRight size={14} color={DS.Color.text2} />
              </Pressable>
            )}
          </View>

          {/* Mixer Info */}
          <View style={styles.mixerInfo}>
            <View style={styles.groupsRow}>
              <Image
                source={mixer.groupA?.coverImageUrl ? { uri: mixer.groupA.coverImageUrl } : DEFAULT_GROUP_LOGO}
                style={styles.groupImage}
                resizeMode="cover"
              />
              <Text style={styles.mixerTitle}>
                {groupAName} × {groupBName}
              </Text>
              <Image
                source={mixer.groupB?.coverImageUrl ? { uri: mixer.groupB.coverImageUrl } : DEFAULT_GROUP_LOGO}
                style={styles.groupImage}
                resizeMode="cover"
              />
            </View>
            {activityName && (
              <View style={styles.activityRow}>
                <Sparkles size={14} color={DS.Grad.accent.colors[0]} />
                <Text style={styles.activityName}>{activityName}</Text>
              </View>
            )}
          </View>

          {/* Chemistry Score */}
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Chemistry Score</Text>
            <View style={styles.scoreBarContainer}>
              <View style={styles.scoreBarBg}>
                <LinearGradient
                  colors={DS.Grad.accent.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.scoreBarFill, { width: `${chemistryScore}%` }]}
                />
              </View>
              <Text style={styles.scoreValue}>{chemistryScore}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{topMixer.breakdown.storyPosts}</Text>
              <Text style={styles.statLabel}>Stories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{topMixer.breakdown.totalReactions}</Text>
              <Text style={styles.statLabel}>Reactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {Math.round(topMixer.breakdown.wouldMixAgainRate * 100)}%
              </Text>
              <Text style={styles.statLabel}>Would Mix Again</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.md,
  },
  card: {
    borderRadius: DS.Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    padding: DS.Spacing.lg,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  trophyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  leaderboardText: {
    fontSize: 13,
    color: DS.Color.text2,
  },
  mixerInfo: {
    marginBottom: DS.Spacing.md,
  },
  groupsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.Spacing.sm,
    marginBottom: DS.Spacing.xs,
  },
  groupImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  mixerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DS.Color.text,
    textAlign: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activityName: {
    fontSize: 14,
    color: DS.Color.text2,
  },
  scoreSection: {
    marginBottom: DS.Spacing.md,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text2,
    marginBottom: 6,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
    width: 32,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.Color.text,
  },
  statLabel: {
    fontSize: 11,
    color: DS.Color.text2,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: DS.Color.stroke,
  },
  skeletonCard: {
    borderRadius: DS.Radius.lg,
    backgroundColor: DS.Color.panel,
    padding: DS.Spacing.lg,
  },
  skeletonTitle: {
    height: 20,
    width: 200,
    backgroundColor: DS.Color.stroke,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    width: 150,
    backgroundColor: DS.Color.stroke,
    borderRadius: 4,
  },
});

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Trophy, Medal } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { WeeklyMixerRanking } from '@/lib/api';

// Default group logo
const DEFAULT_GROUP_LOGO = require('../../assets/images/default-group-logo.png');

interface LeaderboardSheetProps {
  visible: boolean;
  onClose: () => void;
  leaderboard: WeeklyMixerRanking[];
  weekStart: string;
  onMixerPress?: (mixerId: string) => void;
}

export function LeaderboardSheet({
  visible,
  onClose,
  leaderboard,
  weekStart,
  onMixerPress,
}: LeaderboardSheetProps) {
  const insets = useSafeAreaInsets();

  const formatWeekStart = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={18} color="#FFD700" />;
    if (rank === 2) return <Medal size={18} color="#C0C0C0" />;
    if (rank === 3) return <Medal size={18} color="#CD7F32" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return DS.Color.text2;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[DS.Color.bg, 'rgba(10, 15, 26, 0.98)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Trophy size={24} color="#FFD700" />
            <View>
              <Text style={styles.headerTitle}>Weekly Leaderboard</Text>
              <Text style={styles.weekLabel}>Week of {formatWeekStart(weekStart)}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.tap();
              onClose();
            }}
            style={styles.closeButton}
          >
            <X size={24} color={DS.Color.text} />
          </Pressable>
        </View>

        {/* Leaderboard List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No rankings yet this week</Text>
              <Text style={styles.emptySubtext}>
                Complete mixers and engage to climb the leaderboard!
              </Text>
            </View>
          ) : (
            leaderboard.map((item, index) => (
              <Pressable
                key={item.mixerId}
                onPress={() => {
                  Haptics.tap();
                  onMixerPress?.(item.mixerId);
                }}
                style={({ pressed }) => [
                  styles.rankItem,
                  index === 0 && styles.rankItemFirst,
                  pressed && styles.rankItemPressed,
                ]}
              >
                {/* Rank */}
                <View style={styles.rankBadge}>
                  {getRankIcon(item.rank) || (
                    <Text style={[styles.rankNumber, { color: getRankColor(item.rank) }]}>
                      {item.rank}
                    </Text>
                  )}
                </View>

                {/* Mixer Info */}
                <View style={styles.mixerInfo}>
                  <View style={styles.groupImages}>
                    <Image
                      source={item.mixer.groupA?.coverImageUrl ? { uri: item.mixer.groupA.coverImageUrl } : DEFAULT_GROUP_LOGO}
                      style={styles.groupImage}
                      resizeMode="cover"
                    />
                    <Image
                      source={item.mixer.groupB?.coverImageUrl ? { uri: item.mixer.groupB.coverImageUrl } : DEFAULT_GROUP_LOGO}
                      style={[styles.groupImage, styles.groupImageOverlap]}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.mixerDetails}>
                    <Text style={styles.mixerTitle} numberOfLines={1}>
                      {item.mixer.groupA?.name ?? 'Group A'} ×{' '}
                      {item.mixer.groupB?.name ?? 'Group B'}
                    </Text>
                    {item.mixer.activity && (
                      <Text style={styles.activityName} numberOfLines={1}>
                        {item.mixer.activity.name}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                  <Text style={[styles.scoreValue, { color: getRankColor(item.rank) }]}>
                    {Math.round(item.score)}
                  </Text>
                  <Text style={styles.scoreLabel}>pts</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.Color.text,
  },
  weekLabel: {
    fontSize: 13,
    color: DS.Color.text2,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: DS.Spacing.lg,
    gap: DS.Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: DS.Spacing.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.Color.text,
    marginBottom: DS.Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    padding: DS.Spacing.md,
    gap: DS.Spacing.md,
  },
  rankItemFirst: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  rankItemPressed: {
    opacity: 0.8,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  mixerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
  },
  groupImages: {
    flexDirection: 'row',
    width: 44,
  },
  groupImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: DS.Color.bg,
  },
  groupImageOverlap: {
    marginLeft: -12,
  },
  mixerDetails: {
    flex: 1,
  },
  mixerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
  activityName: {
    fontSize: 12,
    color: DS.Color.text2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
    color: DS.Color.text2,
  },
});

import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { Users, Star } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { Pill } from '@/components/Pill';
import { colors as C, fonts as F } from '@/lib/theme';

// Default group logo
const DEFAULT_GROUP_LOGO = require('../../assets/images/default-group-logo.png');

interface GroupCardProps {
  name: string;
  category: string;
  memberCount: number;
  coverUrl?: string;
  tags?: string[];
  starRating?: number | null;
  totalRatings?: number;
}

export function GroupCard({
  name,
  category,
  memberCount,
  coverUrl,
  tags = [],
  starRating,
  totalRatings = 0,
}: GroupCardProps) {
  return (
    <GlassCard padding={14}>
      <View style={styles.container}>
        {/* Cover Image / Avatar */}
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
          ) : (
            <Image source={DEFAULT_GROUP_LOGO} style={styles.coverImage} resizeMode="cover" />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Pill text={category} />
          </View>

          {/* Member count + Rating */}
          <View style={styles.memberRow}>
            <Users size={12} color={C.ink3} />
            <Text style={styles.memberText}>{memberCount} members</Text>
            {starRating !== undefined && starRating !== null && totalRatings > 0 && (
              <>
                <Text style={styles.memberText}>·</Text>
                <Star size={12} color={C.amber} fill={C.amber} />
                <Text style={styles.ratingText}>{starRating.toFixed(1)}</Text>
              </>
            )}
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContent}
            >
              {tags.slice(0, 4).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  coverContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: C.surface2,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: F.bold,
    color: C.ink,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.semibold,
    color: C.ink,
    letterSpacing: -0.2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberText: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.ink3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.amber,
  },
  tagsScroll: {
    marginTop: 2,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  tagsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.surface2,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: C.ink2,
  },
});

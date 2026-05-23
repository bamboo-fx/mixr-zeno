import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { Users, Star } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { Pill } from '@/components/Pill';
import { DS } from '@/lib/ds';

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
    <GlassCard padding={DS.Spacing.md}>
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
            <Users size={12} color={DS.Color.text3} />
            <Text style={styles.memberText}>{memberCount} members</Text>
            {starRating !== undefined && starRating !== null && totalRatings > 0 && (
              <>
                <Text style={styles.memberText}>·</Text>
                <Star size={12} color="#FBBF24" fill="#FBBF24" />
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
    gap: DS.Spacing.md,
  },
  coverContainer: {
    width: 64,
    height: 64,
    borderRadius: DS.Radius.md,
    backgroundColor: DS.Color.panel2,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
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
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  tagsScroll: {
    marginTop: 2,
    marginHorizontal: -DS.Spacing.md,
    paddingHorizontal: DS.Spacing.md,
  },
  tagsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 100,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text2,
  },
});

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Users,
  Heart,
  GraduationCap,
  Wine,
  CheckCircle,
  ChevronRight,
} from 'lucide-react-native';
import type { DrinkingPreference, RelationshipStatus, MemberRole } from '@/lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GelBackground, GelCard, GelPill } from '@/components/gel';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

const DRINKING_LABELS: Record<DrinkingPreference, string> = {
  sober: 'Sober',
  light: 'Light',
  flexible: 'Flexible',
  heavy: 'Heavy',
};

const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  single: 'Single',
  taken: 'Taken',
  complicated: 'Complicated',
  prefer_not_to_say: 'Private',
};

const ROLE_LABELS: Record<MemberRole, string> = {
  member: 'Member',
  social_chair: 'Social Chair',
  admin: 'Admin',
};

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: () => api.profiles.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <GelBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DS.Color.gelPurple} />
        </View>
      </GelBackground>
    );
  }

  if (error || !user) {
    return (
      <GelBackground>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Users size={48} color={DS.Color.text3} />
          <Text style={styles.emptyTitle}>User not found</Text>
          <Pressable onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Go back</Text>
          </Pressable>
        </View>
      </GelBackground>
    );
  }

  const initials = getInitials(user.name);
  const myInterests = user.interests ?? [];
  const myMemberships = user.groupMemberships ?? [];
  const drinkingLabel = user.drinkingPreference ? DRINKING_LABELS[user.drinkingPreference] : null;
  const relationshipLabel = user.relationshipStatus ? RELATIONSHIP_LABELS[user.relationshipStatus] : null;

  const yearLabel = user.yearInSchool
    ? user.yearInSchool.charAt(0).toUpperCase() + user.yearInSchool.slice(1)
    : null;

  const avatarUrl = user.avatarUrl
    ? user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : api.profileMedia.getFileUrl(user.avatarUrl)
    : null;

  const headerUrl = user.headerUrl
    ? user.headerUrl.startsWith('http')
      ? user.headerUrl
      : api.profileMedia.getFileUrl(user.headerUrl)
    : null;

  return (
    <GelBackground>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Photo Background */}
        <View style={styles.headerWrapper}>
          {headerUrl ? (
            <Image source={{ uri: headerUrl }} style={styles.headerImage} />
          ) : (
            <LinearGradient
              colors={DS.Grad.gelGlow.colors as unknown as [string, string, string]}
              start={DS.Grad.gelGlow.start}
              end={DS.Grad.gelGlow.end}
              style={[styles.headerGradient, { paddingTop: insets.top }]}
            />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.headerOverlay}
          />

          {/* Back button */}
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={[styles.backButton, { top: insets.top + 12 }]}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarNeonRing}>
            <LinearGradient
              colors={['#E8D4FF', '#7AECC4', '#3AE3A0', '#28C988', '#9B6DD8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRingGradient}
            />
            <View style={styles.avatarHighlightRing} />
            <View style={styles.avatarInner}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={{ height: 32 }} />

          {/* Name + college + year */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              {user.eduVerified && (
                <CheckCircle size={20} color={DS.Color.success} />
              )}
            </View>
            <View style={styles.metaRow}>
              {user.college && (
                <Text style={styles.metaText}>{user.college.name}</Text>
              )}
              {yearLabel && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{yearLabel}</Text>
                </>
              )}
            </View>
            {user.bio && (
              <Text style={styles.bioText}>{user.bio}</Text>
            )}
          </View>

          {/* Status pills */}
          <View style={styles.pillsRow}>
            {drinkingLabel && <GelPill text={drinkingLabel} variant="accent" />}
            {relationshipLabel && <GelPill text={relationshipLabel} variant="default" />}
            {user.personalityIndex !== undefined && (
              <GelPill text={`Vibe ${Math.round(user.personalityIndex * 100)}`} variant="accent" />
            )}
          </View>

          {/* Interests */}
          {myInterests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={15} color={DS.Color.pinkSparkle} />
                <Text style={styles.sectionTitle}>Interests</Text>
              </View>
              <View style={styles.interestsGrid}>
                {myInterests.map((item, idx) => (
                  <GelPill key={idx} text={item.interest.name} variant="accent" />
                ))}
              </View>
            </View>
          )}

          {/* Groups */}
          {myMemberships.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users size={15} color={DS.Color.gelPurple} />
                <Text style={styles.sectionTitle}>Groups</Text>
              </View>
              <View style={styles.groupsList}>
                {myMemberships.map((membership) => {
                  const roleLabel = ROLE_LABELS[membership.role] ?? membership.role;

                  return (
                    <Pressable
                      key={membership.id}
                      onPress={() => {
                        Haptics.tap();
                        router.push(`/group/${membership.groupId}`);
                      }}
                    >
                      <GelCard padding={DS.Spacing.md}>
                        <View style={styles.groupRow}>
                          {membership.group?.coverImageUrl ? (
                            <Image
                              source={{ uri: membership.group.coverImageUrl }}
                              style={styles.groupImage}
                            />
                          ) : (
                            <LinearGradient
                              colors={['#3AE3A0', '#4F7CFF']}
                              style={styles.groupImagePlaceholder}
                            >
                              <Users size={20} color="#FFFFFF" />
                            </LinearGradient>
                          )}
                          <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>
                              {membership.group?.name ?? 'Unknown Group'}
                            </Text>
                            <GelPill text={roleLabel} variant="accent" size="sm" />
                          </View>
                          <ChevronRight size={16} color={DS.Color.text3} />
                        </View>
                      </GelCard>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </GelBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: DS.Color.text2,
    fontSize: 16,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: DS.Color.glass,
  },
  emptyButtonText: {
    color: DS.Color.text2,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: DS.Spacing.lg,
  },
  headerWrapper: {
    height: 180,
    position: 'relative',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarWrapper: {
    marginTop: -48,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarNeonRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7AECC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarRingGradient: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarHighlightRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 212, 255, 0.6)',
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '900',
    color: DS.Color.gelPurple,
  },
  content: {
    paddingHorizontal: DS.Spacing.lg,
    marginTop: 45,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: DS.Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: DS.Color.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 14,
    color: DS.Color.text2,
  },
  metaDot: {
    color: DS.Color.text3,
    fontSize: 14,
  },
  bioText: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: DS.Spacing.xl,
  },
  section: {
    marginBottom: DS.Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: DS.Spacing.md,
  },
  sectionTitle: {
    color: DS.Color.text3,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupsList: {
    gap: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  groupImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    color: DS.Color.text,
    fontWeight: '700',
    fontSize: 14,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Users,
  Heart,
  CheckCircle,
  User,
  MessageCircle,
  Send,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrinkingPreference, GroupMember, MemberRole, RelationshipStatus } from '@/lib/types';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api } from '@/lib/api';
import { GelBackground, GelCard, GelPill } from '@/components/gel';
import { useAuthStore } from '@/lib/state/auth-store';

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

export default function ViewProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.profile);
  const [messageSending, setMessageSending] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.profiles.get(id!),
    enabled: !!id,
  });

  // Check if there's an existing conversation with this user
  const { data: existingConversation } = useQuery({
    queryKey: ['dm-conversation-with', currentUser?.id, id],
    queryFn: () => api.dm.getConversationWith(currentUser!.id, id!),
    enabled: !!currentUser?.id && !!id && currentUser.id !== id,
  });

  const sendMessageRequestMutation = useMutation({
    mutationFn: () => api.dm.sendRequest(currentUser!.id, id!),
    onSuccess: (conversation) => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', currentUser?.id] });
      // Navigate to the DM chat
      router.push({
        pathname: '/dm-chat',
        params: {
          conversationId: conversation.id,
          otherUserName: profile?.name ?? 'User',
          otherUserId: id,
        },
      });
    },
    onError: (err: Error) => {
      Haptics.error();
      Alert.alert('Error', err.message || 'Could not send message request');
    },
  });

  const handleMessagePress = async () => {
    if (!currentUser?.id || !id) return;

    Haptics.tap();
    setMessageSending(true);

    try {
      // If conversation exists, navigate directly
      if (existingConversation) {
        router.push({
          pathname: '/dm-chat',
          params: {
            conversationId: existingConversation.id,
            otherUserName: profile?.name ?? 'User',
            otherUserId: id,
          },
        });
      } else {
        // Send a message request
        sendMessageRequestMutation.mutate();
      }
    } finally {
      setMessageSending(false);
    }
  };

  const isOwnProfile = currentUser?.id === id;

  if (isLoading) {
    return (
      <GelBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={DS.Color.gelPurple} />
        </View>
      </GelBackground>
    );
  }

  if (error || !profile) {
    return (
      <GelBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButtonError}
          >
            <ChevronLeft size={24} color={DS.Color.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.errorContent}>
            <User size={48} color={DS.Color.text3} />
            <Text style={styles.errorText}>Profile not found</Text>
          </View>
        </View>
      </GelBackground>
    );
  }

  const initials = profile.name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const myInterests = profile.interests ?? [];
  const myMemberships = profile.groupMemberships ?? [];
  const drinkingLabel = DRINKING_LABELS[profile.drinkingPreference];

  const yearLabel = profile.yearInSchool
    ? profile.yearInSchool.charAt(0).toUpperCase() + profile.yearInSchool.slice(1)
    : null;

  const avatarUrl = profile.avatarUrl
    ? profile.avatarUrl.startsWith('http')
      ? profile.avatarUrl
      : api.profileMedia.getFileUrl(profile.avatarUrl)
    : null;

  const headerUrl = profile.headerUrl
    ? profile.headerUrl.startsWith('http')
      ? profile.headerUrl
      : api.profileMedia.getFileUrl(profile.headerUrl)
    : null;

  return (
    <GelBackground>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
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

          {/* Header overlay for better visibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.headerOverlay}
          />

          {/* Back Button */}
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={[styles.backButton, { top: insets.top + 10 }]}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View>
            {/* Outer glow layer */}
            <View style={styles.avatarOuterGlow} />

            {/* Neon ring with multiple layers for 3D effect */}
            <View style={styles.avatarNeonRing}>
              {/* Main purple ring gradient */}
              <LinearGradient
                colors={['#E8D4FF', '#C084FC', '#A855F7', '#7C3AED', '#9B6DD8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRingGradient}
              />

              {/* Inner highlight ring */}
              <View style={styles.avatarHighlightRing} />

              {/* Avatar inner container */}
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Avatar overlap spacer */}
          <View style={{ height: 32 }} />

          {/* Name + college + year */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              {profile.eduVerified && (
                <CheckCircle size={20} color={DS.Color.success} />
              )}
            </View>
            <View style={styles.metaRow}>
              {profile.college && (
                <Text style={styles.metaText}>{profile.college.name}</Text>
              )}
              {yearLabel && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{yearLabel}</Text>
                </>
              )}
            </View>
            {profile.bio && (
              <Text style={styles.bioText}>{profile.bio}</Text>
            )}
          </View>

          {/* Status pills */}
          <View style={styles.pillsRow}>
            <GelPill text={drinkingLabel} variant="accent" />
            {profile.relationshipStatus && (
              <GelPill text={RELATIONSHIP_LABELS[profile.relationshipStatus]} variant="default" />
            )}
            <GelPill text={`Vibe ${Math.round(profile.personalityIndex * 100)}`} variant="accent" />
          </View>

          {/* Message button - only show for other users */}
          {!isOwnProfile && (
            <Pressable
              onPress={handleMessagePress}
              disabled={messageSending || sendMessageRequestMutation.isPending}
              style={({ pressed }) => [
                styles.messageButton,
                pressed && styles.messageButtonPressed,
                (messageSending || sendMessageRequestMutation.isPending) && styles.messageButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageButtonGradient}
              >
                {messageSending || sendMessageRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {existingConversation ? (
                      <MessageCircle size={18} color="#FFFFFF" />
                    ) : (
                      <Send size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.messageButtonText}>
                      {existingConversation ? 'Message' : 'Send Message Request'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

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
                {myMemberships.map((membership: GroupMember) => {
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
                          <View style={styles.groupImagePlaceholder}>
                            <Users size={20} color={DS.Color.gelPurple} />
                          </View>
                          <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>
                              {membership.group?.name ?? membership.groupId}
                            </Text>
                            <GelPill text={roleLabel} variant="accent" size="sm" />
                          </View>
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
  backButtonError: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: DS.Color.text,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContent: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: DS.Color.text2,
    fontSize: 18,
    fontWeight: '600',
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
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    marginTop: -48,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarOuterGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -7,
    left: -7,
    backgroundColor: 'transparent',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarNeonRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C084FC',
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
    marginBottom: DS.Spacing.lg,
  },
  messageButton: {
    marginBottom: DS.Spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  groupImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: DS.Color.glass,
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

import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable, Image, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Zap, Users, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { MetalButton } from '@/components/gel';
import { DS } from '@/lib/ds';
import type { Mixer, Profile } from '@/lib/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getSharedInterests(myProfile: Profile | null, partner: Profile | null): string[] {
  if (!myProfile?.interests || !partner?.interests) return [];
  const mySet = new Set(myProfile.interests.map((i) => i.interest.name));
  return partner.interests
    .map((i) => i.interest.name)
    .filter((n) => mySet.has(n))
    .slice(0, 5);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function HeaderLabel() {
  return (
    <Animated.View entering={FadeIn.delay(100)} style={styles.headerLabelWrap}>
      <LinearGradient
        colors={['rgba(168,85,247,0.25)', 'rgba(124,58,237,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerLabelGradient}
      >
        <Zap size={11} color="#C084FC" fill="#C084FC" />
        <Text style={styles.headerLabelText}>YOUR MIXER HAS STARTED</Text>
        <Zap size={11} color="#C084FC" fill="#C084FC" />
      </LinearGradient>
    </Animated.View>
  );
}

function ActivityCard({ mixer }: { mixer: Mixer }) {
  if (!mixer.activity) return null;
  return (
    <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.activityCard}>
      <LinearGradient
        colors={['rgba(139,92,246,0.18)', 'rgba(124,58,237,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activityCardInner}
      >
        <View style={styles.activityCardHeader}>
          <Zap size={14} color="#A855F7" fill="rgba(168,85,247,0.3)" />
          <Text style={styles.activityName}>{mixer.activity.name}</Text>
        </View>
        {mixer.location ? (
          <View style={styles.activityLocation}>
            <MapPin size={12} color={DS.Color.text3} />
            <Text style={styles.activityLocationText}>{mixer.location}</Text>
          </View>
        ) : null}
        {mixer.activity.description ? (
          <Text style={styles.activityDescription} numberOfLines={2}>
            {mixer.activity.description}
          </Text>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

function AvatarCircle({
  profile,
  size,
  delay,
  glowColor,
}: {
  profile: Profile;
  size: number;
  delay: number;
  glowColor?: string;
}) {
  const glow = glowColor ?? '#A855F7';
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify()} style={{ alignItems: 'center' }}>
      {/* Outer glow ring */}
      <View
        style={[
          styles.avatarGlowRing,
          {
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            shadowColor: glow,
            borderColor: glow + '60',
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(168,85,247,0.35)', 'rgba(217,70,239,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.avatarGlowInner,
            { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 },
          ]}
        >
          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={{ width: size, height: size, borderRadius: size / 2 }}
            />
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#A855F7', '#D946EF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: size * 0.33, fontWeight: '800' }}>
                {getInitials(profile.name)}
              </Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

function SmallAvatarCircle({ profile, index }: { profile: Profile; index: number }) {
  const size = 54;
  const offsetLeft = index * 36;
  return (
    <Animated.View
      entering={ZoomIn.delay(400 + index * 80).springify()}
      style={[styles.stackedAvatarWrap, { left: offsetLeft }]}
    >
      {profile.avatarUrl ? (
        <Image
          source={{ uri: profile.avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#1A0F35' }}
        />
      ) : (
        <LinearGradient
          colors={['#7C3AED', '#A855F7', '#D946EF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#1A0F35',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
            {getInitials(profile.name)}
          </Text>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// Main Modal Props
// ─────────────────────────────────────────────

interface LiveActivationModalProps {
  visible: boolean;
  mixer: Mixer;
  profileId: string;
  myProfile: Profile | null;
  onDismiss: () => void;
}

// ─────────────────────────────────────────────
// Case A — Individual Pairing
// ─────────────────────────────────────────────

function CaseAContent({
  mixer,
  profileId,
  myProfile,
  onDismiss,
}: {
  mixer: Mixer;
  profileId: string;
  myProfile: Profile | null;
  onDismiss: () => void;
}) {
  const myPairing = useMemo(
    () =>
      mixer.pairings?.find(
        (p) => p.userAId === profileId || p.userBId === profileId
      ) ?? null,
    [mixer.pairings, profileId]
  );

  const partner = useMemo(() => {
    if (!myPairing) return null;
    return myPairing.userAId === profileId ? myPairing.userB ?? null : myPairing.userA ?? null;
  }, [myPairing, profileId]);

  const sharedInterests = useMemo(
    () => getSharedInterests(myProfile, partner ?? null),
    [myProfile, partner]
  );

  if (!partner) return null;

  const college = partner.college?.name ?? '';
  const year = partner.yearInSchool ?? '';
  const meta = [college, year].filter(Boolean).join(' · ');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.caseContent}
    >
      <HeaderLabel />

      <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.titleLarge}>
        Your Pairing
      </Animated.Text>

      {/* Partner Avatar */}
      <View style={styles.avatarSection}>
        <AvatarCircle profile={partner} size={96} delay={400} />
      </View>

      {/* Partner Info */}
      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.partnerInfo}>
        <Text style={styles.partnerName}>{partner.name}</Text>
        {meta ? <Text style={styles.partnerMeta}>{meta}</Text> : null}
      </Animated.View>

      {/* Shared Interests */}
      {sharedInterests.length > 0 && (
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.interestsSection}>
          <Text style={styles.interestLabel}>You both like</Text>
          <View style={styles.interestChips}>
            {sharedInterests.map((interest, idx) => (
              <Animated.View
                key={interest}
                entering={FadeIn.delay(650 + idx * 60)}
                style={styles.interestChip}
              >
                <LinearGradient
                  colors={['rgba(168,85,247,0.30)', 'rgba(124,58,237,0.18)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.interestChipInner}
                >
                  <Text style={styles.interestChipText}>{interest}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Activity Card */}
      <ActivityCard mixer={mixer} />

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.ctaWrap}>
        <MetalButton variant="primary" fullWidth onPress={onDismiss}>
          <Text style={styles.ctaText}>Find Them</Text>
          <Text style={styles.ctaArrow}> →</Text>
        </MetalButton>
      </Animated.View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Case B — Sub-cluster / Group
// ─────────────────────────────────────────────

function CaseBContent({
  mixer,
  onDismiss,
}: {
  mixer: Mixer;
  onDismiss: () => void;
}) {
  // Collect up to 4 unique participant profiles from participants
  const participantProfiles = useMemo(() => {
    const profiles: Profile[] = [];
    const seen = new Set<string>();
    for (const p of mixer.participants ?? []) {
      if (p.user && !seen.has(p.userId)) {
        seen.add(p.userId);
        profiles.push(p.user);
      }
      if (profiles.length >= 4) break;
    }
    return profiles;
  }, [mixer.participants]);

  const totalCount = mixer.participants?.length ?? 0;
  const extraCount = Math.max(0, totalCount - 4);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.caseContent}
    >
      <HeaderLabel />

      <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.titleLarge}>
        Meet Your Group
      </Animated.Text>

      {/* Stacked Avatars */}
      {participantProfiles.length > 0 && (
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.stackedAvatarsContainer}>
          <View style={[styles.stackedAvatarsRow, { width: 54 + (participantProfiles.length - 1) * 36 }]}>
            {participantProfiles.map((p, idx) => (
              <SmallAvatarCircle key={p.id} profile={p} index={idx} />
            ))}
          </View>
          {extraCount > 0 && (
            <Animated.Text entering={FadeIn.delay(700)} style={styles.extraCount}>
              +{extraCount} more
            </Animated.Text>
          )}
        </Animated.View>
      )}

      {/* Group context */}
      <Animated.View entering={FadeInDown.delay(460).springify()} style={styles.groupContext}>
        <Users size={14} color={DS.Color.text3} />
        <Text style={styles.groupContextText}>
          {mixer.groupA?.name ?? 'Group A'} × {mixer.groupB?.name ?? 'Group B'}
        </Text>
      </Animated.View>

      {/* Activity Card */}
      <ActivityCard mixer={mixer} />

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.ctaWrap}>
        <MetalButton variant="primary" fullWidth onPress={onDismiss}>
          <Text style={styles.ctaText}>Meet Your Group</Text>
          <Text style={styles.ctaArrow}> →</Text>
        </MetalButton>
      </Animated.View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Case C — Open Mixer
// ─────────────────────────────────────────────

function CaseCContent({
  mixer,
  onDismiss,
}: {
  mixer: Mixer;
  onDismiss: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.caseContent}
    >
      <HeaderLabel />

      <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.titleLarge}>
        Let's Go
      </Animated.Text>

      {/* Group names */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.openGroupsRow}>
        <Text style={styles.openGroupsText}>
          {mixer.groupA?.name ?? 'Group A'}
        </Text>
        <LinearGradient
          colors={['#A855F7', '#D946EF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.openGroupDivider}
        />
        <Text style={styles.openGroupsText}>
          {mixer.groupB?.name ?? 'Group B'}
        </Text>
      </Animated.View>

      {/* Prominent activity card */}
      {mixer.activity ? (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.openActivityCard}>
          <LinearGradient
            colors={['rgba(168,85,247,0.22)', 'rgba(124,58,237,0.12)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.openActivityCardInner}
          >
            {/* Activity label */}
            <View style={styles.openActivityLabelRow}>
              <Zap size={16} color="#A855F7" fill="rgba(168,85,247,0.4)" />
              <Text style={styles.openActivityName}>{mixer.activity.name}</Text>
            </View>

            {/* Location */}
            {mixer.location ? (
              <View style={styles.activityLocation}>
                <MapPin size={13} color={DS.Color.text3} />
                <Text style={styles.activityLocationText}>{mixer.location}</Text>
              </View>
            ) : null}

            {/* Description */}
            {mixer.activity.description ? (
              <Text style={styles.openActivityDescription}>
                {mixer.activity.description}
              </Text>
            ) : null}

            {/* Instructions */}
            {mixer.activity.instructions ? (
              <View style={styles.openInstructionsBox}>
                <Text style={styles.openInstructionsLabel}>HOW IT WORKS</Text>
                <Text style={styles.openInstructionsText}>
                  {mixer.activity.instructions}
                </Text>
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.openLocationOnly}>
          <MapPin size={16} color={DS.Color.text3} />
          <Text style={styles.openLocationText}>{mixer.location}</Text>
        </Animated.View>
      )}

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.ctaWrap}>
        <MetalButton variant="primary" fullWidth onPress={onDismiss}>
          <Text style={styles.ctaText}>Let's Go</Text>
          <Text style={styles.ctaArrow}> →</Text>
        </MetalButton>
      </Animated.View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Root Modal
// ─────────────────────────────────────────────

export function LiveActivationModal({
  visible,
  mixer,
  profileId,
  myProfile,
  onDismiss,
}: LiveActivationModalProps) {
  // Determine which case we're in
  const caseType = useMemo<'A' | 'B' | 'C'>(() => {
    const pairings = mixer.pairings ?? [];
    if (pairings.length === 0) return 'C';

    const hasMyPairing = pairings.some(
      (p) => p.userAId === profileId || p.userBId === profileId
    );
    if (hasMyPairing) return 'A';

    // Has pairings but none for me — sub-cluster
    const isSmartMode = mixer.pairingMode === 'smart';
    const hasMultiGroup =
      mixer.participants?.some((p) => p.groupId !== mixer.groupAId) ?? false;
    if (isSmartMode || hasMultiGroup) return 'B';

    return 'C';
  }, [mixer, profileId]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Full-screen overlay */}
      <View style={styles.overlay}>
        {/* Background layers — radial purple glow from center */}
        <LinearGradient
          colors={['#08050d', '#0D0820', '#08050d']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Central radial purple bloom */}
        <LinearGradient
          colors={['rgba(139,58,180,0.55)', 'rgba(100,40,160,0.28)', 'transparent']}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top edge shimmer */}
        <LinearGradient
          colors={['rgba(168,85,247,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Close button */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.closeButton}>
          <Pressable onPress={onDismiss} hitSlop={16} style={styles.closeButtonInner}>
            <X size={20} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Glow orb behind content */}
        <View style={styles.glowOrb} pointerEvents="none">
          <LinearGradient
            colors={['rgba(168,85,247,0.30)', 'rgba(217,70,239,0.15)', 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 300 }}
          />
        </View>

        {/* Content card */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
          <LinearGradient
            colors={['rgba(25,14,50,0.96)', 'rgba(15,8,32,0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardInner}
          >
            {/* Top chrome line */}
            <LinearGradient
              colors={['transparent', 'rgba(168,85,247,0.55)', 'rgba(217,70,239,0.35)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopLine}
            />

            {caseType === 'A' && (
              <CaseAContent
                mixer={mixer}
                profileId={profileId}
                myProfile={myProfile}
                onDismiss={onDismiss}
              />
            )}
            {caseType === 'B' && (
              <CaseBContent mixer={mixer} onDismiss={onDismiss} />
            )}
            {caseType === 'C' && (
              <CaseCContent mixer={mixer} onDismiss={onDismiss} />
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  glowOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    top: '15%',
    left: '50%',
    marginLeft: -200,
    opacity: 0.6,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    maxHeight: '88%',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 0.8,
    borderBottomWidth: 0,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  cardInner: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardTopLine: {
    height: 1,
    width: '100%',
  },
  caseContent: {
    paddingHorizontal: DS.Spacing.xl,
    paddingTop: DS.Spacing.xl,
    paddingBottom: 48,
    alignItems: 'center',
    gap: DS.Spacing.lg,
  },

  // Header label
  headerLabelWrap: {
    alignItems: 'center',
  },
  headerLabelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 0.8,
    borderColor: 'rgba(168,85,247,0.30)',
  },
  headerLabelText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // Titles
  titleLarge: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  // Avatar section (Case A)
  avatarSection: {
    alignItems: 'center',
    marginVertical: DS.Spacing.sm,
  },
  avatarGlowRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarGlowInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Partner info (Case A)
  partnerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  partnerName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  partnerMeta: {
    color: DS.Color.text3,
    fontSize: 14,
  },

  // Interests (Case A)
  interestsSection: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  interestLabel: {
    color: DS.Color.text3,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  interestChip: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  interestChipInner: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 0.8,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  interestChipText: {
    color: '#D8B4FE',
    fontSize: 13,
    fontWeight: '700',
  },

  // Activity card
  activityCard: {
    width: '100%',
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  activityCardInner: {
    padding: DS.Spacing.lg,
    borderRadius: DS.Radius.md,
    gap: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  activityLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityLocationText: {
    color: DS.Color.text3,
    fontSize: 13,
  },
  activityDescription: {
    color: DS.Color.text2,
    fontSize: 13,
    lineHeight: 18,
  },

  // Case B — stacked avatars
  stackedAvatarsContainer: {
    alignItems: 'center',
    gap: 12,
    marginVertical: DS.Spacing.sm,
  },
  stackedAvatarsRow: {
    position: 'relative',
    height: 60,
  },
  stackedAvatarWrap: {
    position: 'absolute',
    top: 0,
  },
  extraCount: {
    color: DS.Color.text3,
    fontSize: 13,
    fontWeight: '600',
  },
  groupContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupContextText: {
    color: DS.Color.text3,
    fontSize: 13,
    fontWeight: '600',
  },

  // Case C
  openGroupsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  openGroupsText: {
    color: DS.Color.text2,
    fontSize: 15,
    fontWeight: '700',
  },
  openGroupDivider: {
    width: 24,
    height: 2,
    borderRadius: 2,
  },
  openActivityCard: {
    width: '100%',
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  openActivityCardInner: {
    padding: DS.Spacing.lg,
    gap: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: DS.Radius.md,
  },
  openActivityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openActivityName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  openActivityDescription: {
    color: DS.Color.text2,
    fontSize: 14,
    lineHeight: 20,
  },
  openInstructionsBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: DS.Radius.sm,
    padding: DS.Spacing.md,
    marginTop: 4,
    gap: 4,
  },
  openInstructionsLabel: {
    color: DS.Color.text3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  openInstructionsText: {
    color: DS.Color.text2,
    fontSize: 13,
    lineHeight: 18,
  },
  openLocationOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: DS.Radius.md,
    padding: DS.Spacing.lg,
    width: '100%',
    borderWidth: 0.8,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  openLocationText: {
    color: DS.Color.text2,
    fontSize: 15,
    fontWeight: '700',
  },

  // CTA
  ctaWrap: {
    width: '100%',
    marginTop: DS.Spacing.sm,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  ctaArrow: {
    color: '#E9D5FF',
    fontWeight: '800',
    fontSize: 17,
  },
});

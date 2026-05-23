import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  ChevronRight,
  Edit3,
  Shield,
  Camera,
  CheckCircle,
  Plus,
  Bell,
  Palette,
  Calendar,
  MapPin,
  Zap,
} from 'lucide-react-native';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { GroupMember, MemberRole, Mixer } from '@/lib/types';
import { Haptics } from '@/lib/haptics';
import { api } from '@/lib/api';
import { InterestsModal } from '@/components/InterestsModal';


const ROLE_LABELS: Record<MemberRole, string> = {
  member: 'Member',
  social_chair: 'Social Chair',
  admin: 'Admin',
};

function ToastModal({ visible, message, onClose }: { visible: boolean; message: string; onClose: () => void }) {
  React.useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 2000);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.toastWrap}>
        <View style={styles.toast}>
          <Text style={styles.toastText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const invalidateSession = useInvalidateSession();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['past-mixers-profile'] });
    setRefreshing(false);
  }, [queryClient]);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);

  const showToast = (msg: string) => { setToastMessage(msg); setToastVisible(true); };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          Haptics.warning();
          logout();
          await authClient.signOut();
          invalidateSession();
        },
      },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please grant camera roll permissions.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please grant camera permissions.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      const rawMime = asset.mimeType ?? 'image/jpeg';
      const mime = (rawMime === 'image/heic' || rawMime === 'image/heif') ? 'image/jpeg' : rawMime;
      const file = { uri: asset.uri, type: mime, name: `avatar-${Date.now()}.jpg` };
      const result = await api.profileMedia.uploadAvatar(profile.id, file);
      updateProfile(result.profile);
      Haptics.success();
      showToast('Profile photo updated!');
    } catch {
      Haptics.error();
      showToast('Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      await api.profileMedia.removeAvatar(profile.id);
      updateProfile({ avatarUrl: undefined });
      Haptics.success();
      showToast('Profile photo removed');
    } catch { Haptics.error(); }
    finally { setUploadingAvatar(false); }
  };

  const showAvatarOptions = () => {
    Haptics.tap();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Choose Photo', 'Take Photo', ...(profile?.avatarUrl ? ['Remove Photo'] : [])], cancelButtonIndex: 0, destructiveButtonIndex: profile?.avatarUrl ? 3 : undefined },
        (i) => { if (i === 1) pickImage(); else if (i === 2) takePhoto(); else if (i === 3) removeAvatar(); }
      );
    } else {
      Alert.alert('Profile Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose Photo', onPress: pickImage },
        { text: 'Take Photo', onPress: takePhoto },
        ...(profile?.avatarUrl ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: removeAvatar }] : []),
      ]);
    }
  };

  const handleSaveInterests = useCallback(async (interestIds: string[]) => {
    if (!profile) return;
    await api.profiles.setInterests(profile.id, interestIds);
    const updated = await api.profiles.get(profile.id);
    updateProfile(updated);
  }, [profile, updateProfile]);

  const earlyGroupIds = profile?.groupMemberships?.map((m) => m.groupId) ?? [];
  const { data: pastMixers = [] } = useQuery<Mixer[]>({
    queryKey: ['past-mixers-profile', earlyGroupIds.join(','), earlyGroupIds.length],
    queryFn: async () => {
      if (earlyGroupIds.length === 0) return [];
      const results = await Promise.all(earlyGroupIds.map((gid) => api.mixers.list({ groupId: gid })));
      const seen = new Set<string>();
      return results.flat().filter((m) => {
        if (m.status !== 'completed') return false;
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }).sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()).slice(0, 10);
    },
    enabled: earlyGroupIds.length > 0,
  });

  if (!profile) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#a855f7" />
      </View>
    );
  }

  const initials = profile.name.split(' ').map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  const myInterests = profile.interests ?? [];
  const myMemberships = profile.groupMemberships ?? [];
  const yearLabel = profile.yearInSchool ? profile.yearInSchool.charAt(0).toUpperCase() + profile.yearInSchool.slice(1) : null;
  const avatarUrl = profile.avatarUrl ? (profile.avatarUrl.startsWith('http') ? profile.avatarUrl : api.profileMedia.getFileUrl(profile.avatarUrl)) : null;

  return (
    <View style={styles.root}>
      <ToastModal visible={toastVisible} message={toastMessage} onClose={() => setToastVisible(false)} />
      <InterestsModal
        visible={interestsModalVisible}
        onClose={() => setInterestsModalVisible(false)}
        selectedInterestIds={myInterests.map((i) => i.interest.id)}
        onSave={handleSaveInterests}
      />


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            progressViewOffset={38}
          />
        }
      >
        {/* ── TOP ROW: notification bell ─── */}
        <View style={styles.topBar}>
          <NotificationBell onPress={() => router.push('/notifications')} />
        </View>

        {/* ── AVATAR ─────────────────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Pressable onPress={showAvatarOptions} style={styles.avatarPressable}>
            <View style={styles.avatarRing}>
              {uploadingAvatar ? (
                <View style={styles.avatarInner}>
                  <ActivityIndicator color="#a855f7" />
                </View>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#a855f7', '#ec4899', '#f97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInner}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Camera size={11} color="#fff" />
            </View>
          </Pressable>

          {/* Name + meta */}
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.metaRow}>
            {profile.eduVerified && <CheckCircle size={14} color="#a855f7" />}
            {profile.college && <Text style={styles.metaText}>{profile.college.name}</Text>}
            {yearLabel && <><Text style={styles.metaDot}>·</Text><Text style={styles.metaText}>{yearLabel}</Text></>}
          </View>
          {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
        </View>

        {/* ── STATS ROW ────────────────────────────────────────────────────── */}
        <View style={styles.statsPill}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{pastMixers.length}</Text>
            <Text style={styles.statLbl}>Mixers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{myMemberships.length}</Text>
            <Text style={styles.statLbl}>Groups</Text>
          </View>
        </View>

        {/* ── BODY ─────────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* INTERESTS */}
          <Text style={styles.sectionLabel}>Interests</Text>
          <View style={styles.card}>
            {myInterests.length > 0 ? (
              <View style={styles.interestsPad}>
                <View style={styles.interestsWrap}>
                  {myInterests.map((item, idx) => (
                    <View key={idx} style={styles.interestTag}>
                      <Text style={styles.interestTagText}>{item.interest.name}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => { Haptics.tap(); setInterestsModalVisible(true); }} style={styles.editInterestsBtn}>
                  <Edit3 size={12} color="rgba(168,85,247,0.8)" />
                  <Text style={styles.editInterestsTxt}>Edit interests</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => { Haptics.tap(); setInterestsModalVisible(true); }} style={styles.emptyInterestsBtn}>
                <Plus size={16} color="rgba(168,85,247,0.6)" />
                <Text style={styles.emptyInterestsTxt}>Add Interests</Text>
              </Pressable>
            )}
          </View>

          {/* MY GROUPS */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>My Groups</Text>
          {myMemberships.length > 0 ? (
            <View style={styles.groupsGrid}>
              {myMemberships.map((membership: GroupMember) => {
                const roleLabel = ROLE_LABELS[membership.role] ?? membership.role;
                return (
                  <Pressable
                    key={membership.id}
                    onPress={() => { Haptics.tap(); router.push(`/group/${membership.groupId}`); }}
                    style={({ pressed }) => [styles.groupBoxCard, pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] }]}
                  >
                    <Text style={styles.groupBoxName} numberOfLines={1}>{membership.group?.name ?? membership.groupId}</Text>
                    <View style={styles.groupBoxRolePill}>
                      <Text style={styles.groupBoxRoleText}>{roleLabel.toUpperCase()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.card}>
              <Pressable
                onPress={() => { Haptics.tap(); router.push('/(tabs)/groups'); }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.groupImgEmpty}>
                  <Plus size={18} color="rgba(168,85,247,0.5)" />
                </View>
                <Text style={styles.emptyRowText}>Browse Groups</Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
              </Pressable>
            </View>
          )}

          {/* PAST MIXERS */}
          {pastMixers.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Past Mixers</Text>
              <View style={styles.card}>
                {pastMixers.map((mixer, index) => {
                  const dateStr = mixer.scheduledStart ? format(new Date(mixer.scheduledStart), 'MMM d') : '';
                  const isLast = index === pastMixers.length - 1;
                  return (
                    <React.Fragment key={mixer.id}>
                      <Pressable
                        onPress={() => { Haptics.tap(); router.push(`/mixer/${mixer.id}`); }}
                        style={({ pressed }) => [styles.mixerRow, pressed && styles.rowPressed]}
                      >
                        <View style={styles.mixerAccent} />
                        <View style={styles.mixerContent}>
                          <Text style={styles.mixerTitle} numberOfLines={1}>
                            {mixer.groupA?.name ?? '?'} <Text style={styles.mixerX}>×</Text> {mixer.groupB?.name ?? '?'}
                          </Text>
                          <View style={styles.mixerMeta}>
                            {dateStr ? <><Calendar size={11} color="rgba(168,85,247,0.7)" /><Text style={styles.mixerMetaTxt}>{dateStr}</Text></> : null}
                            {mixer.location ? <><MapPin size={11} color="rgba(168,85,247,0.7)" /><Text style={styles.mixerMetaTxt} numberOfLines={1}>{mixer.location}</Text></> : null}
                          </View>
                        </View>
                        <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                      </Pressable>
                      {!isLast && <View style={styles.divider} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </>
          )}

          {/* SETTINGS */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Settings</Text>
          <View style={styles.card}>
            {[
              { icon: <Edit3 size={17} color="#a855f7" />, bg: 'rgba(168,85,247,0.15)', label: 'Edit Profile', onPress: () => router.push('/edit-profile') },
              { icon: <Shield size={17} color="#22c55e" />, bg: 'rgba(34,197,94,0.15)', label: 'Privacy & Safety', onPress: () => router.push('/privacy-settings') },
              { icon: <Bell size={17} color="#f59e0b" />, bg: 'rgba(245,158,11,0.15)', label: 'Notifications', onPress: () => router.push('/notifications') },
              { icon: <Palette size={17} color="#3b82f6" />, bg: 'rgba(59,130,246,0.15)', label: 'Appearance', onPress: () => {} },
            ].map(({ icon, bg, label, onPress }, idx, arr) => (
              <React.Fragment key={label}>
                <Pressable
                  onPress={() => { Haptics.tap(); onPress(); }}
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                >
                  <View style={[styles.settingsIcon, { backgroundColor: bg }]}>{icon}</View>
                  <Text style={styles.settingsLabel}>{label}</Text>
                  <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                </Pressable>
                {idx < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* LOG OUT */}
          <View style={[styles.card, { marginTop: 14 }]}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
            >
              <View style={[styles.settingsIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <LogOut size={17} color="#ef4444" />
              </View>
              <Text style={[styles.settingsLabel, { color: '#ef4444' }]}>Log Out</Text>
            </Pressable>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>MIXR v1.0.0</Text>
            <Text style={styles.footerSub}>Made with love for college mixers</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d14' },
  loadingScreen: { flex: 1, backgroundColor: '#0d0d14', alignItems: 'center', justifyContent: 'center' },

  // Toast
  toastWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 120 },
  toast: {
    backgroundColor: 'rgba(28,28,30,0.95)', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Top bar
  topBar: { alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 8 },

  // Avatar section
  avatarSection: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  avatarPressable: { alignItems: 'center', justifyContent: 'center', marginBottom: 14, alignSelf: 'center' },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: '#a855f7',
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  avatarInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  cameraBadge: {
    position: 'absolute',
    bottom: 16,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0d0d14',
  },
  name: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.4, marginBottom: 5, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '400' },
  metaDot: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  bioText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 19 },

  // Stats pill
  statsPill: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 10 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#c084fc', letterSpacing: -0.3 },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: 0.3 },

  // Body
  body: { paddingHorizontal: 16 },

  // Section label — matches reference exactly
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 2,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 60 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },

  // Interests
  interestsPad: { padding: 14, paddingBottom: 10 },
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  interestTag: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  interestTagText: { color: '#c084fc', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  editInterestsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  editInterestsTxt: { color: 'rgba(168,85,247,0.8)', fontSize: 13, fontWeight: '600' },
  emptyInterestsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 8 },
  emptyInterestsTxt: { color: 'rgba(168,85,247,0.6)', fontSize: 14, fontWeight: '500' },

  // Row (groups / settings)
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 },
  groupImg: { width: 44, height: 44, borderRadius: 13, marginRight: 14 },
  groupImgEmpty: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  groupInfo: { flex: 1, marginRight: 10 },
  groupName: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 2 },
  groupMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  groupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  groupBoxCard: {
    width: 104,
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A855F7',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  groupBoxName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
  },
  groupBoxRolePill: {
    backgroundColor: 'rgba(168,85,247,0.25)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  groupBoxRoleText: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rolePill: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  rolePillText: { color: '#c084fc', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  emptyRowText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' },

  // Mixer rows
  mixerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16, minHeight: 56 },
  mixerAccent: { width: 3, alignSelf: 'stretch', backgroundColor: '#a855f7', borderRadius: 2, marginRight: 14 },
  mixerContent: { flex: 1, paddingVertical: 12, gap: 4 },
  mixerTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  mixerX: { color: 'rgba(168,85,247,0.7)', fontWeight: '400' },
  mixerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mixerMetaTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  // Settings
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingsLabel: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 15, fontWeight: '500' },

  // Footer
  footer: { alignItems: 'center', marginTop: 36, marginBottom: 8 },
  footerTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
  footerSub: { fontSize: 11, color: 'rgba(255,255,255,0.12)', marginTop: 3 },
});

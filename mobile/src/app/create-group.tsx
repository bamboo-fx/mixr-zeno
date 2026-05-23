import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { GelBackground, GelCard } from '@/components/gel';
import type { GroupCategory } from '@/lib/types';
import { X, Sparkles, Users, Check, Lock, Globe, Camera, Palette } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '@/lib/haptics';

const CATEGORY_OPTIONS: { key: GroupCategory; label: string; color: string }[] = [
  { key: 'sports', label: 'Sports', color: '#FF6B6B' },
  { key: 'social', label: 'Social', color: '#A78BFA' },
  { key: 'clubs', label: 'Clubs', color: '#4ECDC4' },
  { key: 'other', label: 'Other', color: '#94A3B8' },
];

const CARD_COLORS = [
  { label: 'Purple',    hex: '#A855F7' },
  { label: 'Pink',      hex: '#EC4899' },
  { label: 'Blue',      hex: '#3B82F6' },
  { label: 'Sky',       hex: '#38BDF8' },
  { label: 'Teal',      hex: '#14B8A6' },
  { label: 'Green',     hex: '#22C55E' },
  { label: 'Lime',      hex: '#84CC16' },
  { label: 'Yellow',    hex: '#EAB308' },
  { label: 'Orange',    hex: '#F97316' },
  { label: 'Red',       hex: '#EF4444' },
  { label: 'Rose',      hex: '#FB7185' },
  { label: 'Slate',     hex: '#64748B' },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();

  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<GroupCategory | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [nameActive, setNameActive] = useState<boolean>(false);
  const [descActive, setDescActive] = useState<boolean>(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [headerUri, setHeaderUri] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(CARD_COLORS[0]!.hex);

  const hasCollege = Boolean(profile?.collegeId);
  const isValid = name.trim().length > 0 && category !== null && hasCollege;

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.tap();
      setLogoUri(result.assets[0].uri);
    }
  };

  const pickHeader = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.tap();
      setHeaderUri(result.assets[0].uri);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!profile || !category) throw new Error('Missing required fields');
      return api.groups.create({
        collegeId: profile.collegeId ?? '',
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        coverImageUrl: headerUri ?? undefined,
        createdById: profile.id,
        isPrivate,
        color: selectedColor,
      });
    },
    onSuccess: async () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Refresh profile so groupMemberships includes the new group with nested data
      if (profile?.id) {
        const updatedProfile = await api.profiles.get(profile.id);
        setProfile(updatedProfile);
      }
      router.back();
    },
    onError: () => {
      Haptics.error();
    },
  });

  const handleSubmit = () => {
    if (!isValid || createMutation.isPending) return;
    Haptics.medium();
    createMutation.mutate();
  };

  const selectedCategoryData = category ? CATEGORY_OPTIONS.find((c) => c.key === category) : null;

  return (
    <GelBackground>
      <View style={{ flex: 1 }}>
        {/* Custom header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + DS.Spacing.sm },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={styles.closeButton}
          >
            <X size={20} color={DS.Color.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Group</Text>
          </View>

          {isValid ? (
            <Pressable onPress={handleSubmit} disabled={createMutation.isPending}>
              <LinearGradient
                colors={[...DS.Grad.gelGlow.colors]}
                start={DS.Grad.gelGlow.start}
                end={DS.Grad.gelGlow.end}
                style={styles.createButton}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.createButtonDisabled}>
              <Text style={styles.createButtonTextDisabled}>Create</Text>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 48 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Group Photos */}
            <View style={styles.photosSection}>
              {/* Header Photo - wide banner */}
              <Pressable onPress={pickHeader} style={styles.headerPickerContainer}>
                {headerUri ? (
                  <Image source={{ uri: headerUri }} style={styles.headerPickerImage} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={
                      selectedCategoryData
                        ? [selectedCategoryData.color + '50', selectedCategoryData.color + '20']
                        : ['rgba(138,92,246,0.35)', 'rgba(138,92,246,0.12)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={styles.headerPickerOverlay}>
                  <View style={styles.cameraIconButton}>
                    <Camera size={16} color="#FFFFFF" />
                  </View>
                  {!headerUri && (
                    <Text style={styles.photoPickerLabel}>Add Header Photo</Text>
                  )}
                </View>
              </Pressable>

              {/* Group Logo - square/circle */}
              <Pressable onPress={pickLogo} style={styles.logoPickerContainer}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoPickerImage} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={
                      selectedCategoryData
                        ? [selectedCategoryData.color + '80', selectedCategoryData.color + '40']
                        : [...DS.Grad.gelGlow.colors]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={styles.logoCameraOverlay}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
                {!logoUri && (
                  <Text style={styles.logoInitialText}>
                    {name.trim() ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Preview Card */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionLabel}>Preview</Text>
              <GelCard padding={DS.Spacing.md}>
                <View style={styles.previewCard}>
                  <View style={styles.previewAvatar}>
                    <LinearGradient
                      colors={
                        selectedCategoryData
                          ? [selectedCategoryData.color + '80', selectedCategoryData.color + '40']
                          : [...DS.Grad.gelGlow.colors]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.previewAvatarFallback}
                    >
                      <Text style={styles.previewAvatarText}>
                        {name.trim() ? name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.previewContent}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {name.trim() || 'Group Name'}
                    </Text>
                    <View style={styles.previewMeta}>
                      <Users size={12} color={DS.Color.text3} />
                      <Text style={styles.previewMetaText}>1 member</Text>
                      {category && (
                        <>
                          <Text style={styles.previewMetaText}>·</Text>
                          <View
                            style={[
                              styles.previewCategoryBadge,
                              {
                                backgroundColor: selectedCategoryData?.color + '25',
                                borderColor: selectedCategoryData?.color + '50',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.previewCategoryText,
                                { color: selectedCategoryData?.color },
                              ]}
                            >
                              {category}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </GelCard>
            </View>

            {/* Group Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Group Name *</Text>
              <GelCard padding={0}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameActive(true)}
                  onBlur={() => setNameActive(false)}
                  placeholder="e.g. Alpha Delta Pi, Soccer Club..."
                  placeholderTextColor={DS.Color.text3}
                  style={[styles.input, nameActive && styles.inputActive]}
                  maxLength={50}
                />
              </GelCard>
              <Text style={styles.charCount}>{name.length}/50</Text>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => {
                        Haptics.tap();
                        setCategory(isSelected ? null : cat.key);
                      }}
                      style={[
                        styles.categoryPill,
                        isSelected && {
                          backgroundColor: cat.color + '30',
                          borderColor: cat.color,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color={cat.color} strokeWidth={3} />
                      )}
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && { color: cat.color, fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              <GelCard padding={0}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setDescActive(true)}
                  onBlur={() => setDescActive(false)}
                  placeholder="What is this group about?"
                  placeholderTextColor={DS.Color.text3}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.input, styles.textArea, descActive && styles.inputActive]}
                  maxLength={300}
                />
              </GelCard>
              <Text style={styles.charCount}>{description.length}/300</Text>
            </View>

            {/* Privacy Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Privacy</Text>
              <GelCard padding={DS.Spacing.md}>
                <Pressable
                  onPress={() => {
                    Haptics.tap();
                    setIsPrivate(!isPrivate);
                  }}
                  style={styles.privacyRow}
                >
                  <View
                    style={[
                      styles.privacyIconContainer,
                      { backgroundColor: isPrivate ? DS.Color.gelPurple + '20' : DS.Color.glass },
                    ]}
                  >
                    {isPrivate ? (
                      <Lock size={20} color={DS.Color.gelPurple} />
                    ) : (
                      <Globe size={20} color={DS.Color.text2} />
                    )}
                  </View>
                  <View style={styles.privacyContent}>
                    <Text style={styles.privacyTitle}>
                      {isPrivate ? 'Private Group' : 'Public Group'}
                    </Text>
                    <Text style={styles.privacySubtext}>
                      {isPrivate
                        ? 'Members must request to join'
                        : 'Anyone can join freely'}
                    </Text>
                  </View>
                  <Switch
                    value={isPrivate}
                    onValueChange={(val) => {
                      Haptics.tap();
                      setIsPrivate(val);
                    }}
                    trackColor={{ false: DS.Color.glass, true: DS.Color.gelPurple + '60' }}
                    thumbColor={isPrivate ? DS.Color.gelPurple : DS.Color.text3}
                  />
                </Pressable>
              </GelCard>
            </View>

            {/* Card Color */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: DS.Spacing.sm }}>
                <Palette size={13} color={DS.Color.text3} />
                <Text style={styles.sectionLabel}>Card Color</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {CARD_COLORS.map((c) => {
                  const isActive = selectedColor === c.hex;
                  return (
                    <Pressable
                      key={c.hex}
                      onPress={() => { Haptics.tap(); setSelectedColor(c.hex); }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: c.hex,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isActive ? 3 : 1.5,
                        borderColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                        shadowColor: isActive ? c.hex : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isActive ? 0.85 : 0,
                        shadowRadius: isActive ? 10 : 0,
                        elevation: isActive ? 8 : 0,
                      }}
                    >
                      {isActive && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                    </Pressable>
                  );
                })}
              </View>
              {/* Live preview strip */}
              <View style={{
                marginTop: 16,
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <LinearGradient
                  colors={[selectedColor, selectedColor + 'AA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {/* No college warning */}
            {!hasCollege && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Select a college in your profile to create a group.
                </Text>
              </View>
            )}

            {/* Error display */}
            {createMutation.isError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  Failed to create group. Please try again.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GelBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: DS.Spacing.md,
    borderBottomWidth: DS.Stroke.hairline,
    borderBottomColor: DS.Color.stroke,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DS.Color.text,
    letterSpacing: -0.3,
  },
  createButton: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  createButtonDisabled: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl,
    backgroundColor: DS.Color.glass,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonTextDisabled: {
    color: DS.Color.text3,
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.xl,
  },
  section: {
    marginBottom: DS.Spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.Color.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: DS.Spacing.sm,
  },
  input: {
    color: DS.Color.text,
    fontSize: 16,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 14,
  },
  inputActive: {
    backgroundColor: DS.Color.gelPurple + '08',
  },
  textArea: {
    minHeight: 100,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: DS.Color.text3,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: DS.Color.glass,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  categoryPillText: {
    color: DS.Color.text2,
    fontWeight: '600',
    fontSize: 13,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 12,
  },
  urlInput: {
    flex: 1,
    color: DS.Color.text,
    fontSize: 15,
  },
  imagePreview: {
    marginTop: DS.Spacing.md,
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
    height: 160,
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  imagePreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.Color.gelPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
  privacySubtext: {
    fontSize: 12,
    color: DS.Color.text3,
    marginTop: 2,
  },
  photosSection: {
    marginBottom: DS.Spacing.xl,
    position: 'relative',
  },
  headerPickerContainer: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: DS.Color.glass,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPickerImage: {
    width: '100%',
    height: '100%',
  },
  headerPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPickerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPickerContainer: {
    position: 'absolute',
    bottom: -20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: DS.Color.glass,
    borderWidth: 2,
    borderColor: DS.Color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPickerImage: {
    width: '100%',
    height: '100%',
  },
  logoCameraOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitialText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewSection: {
    marginTop: DS.Spacing.xl,
    marginBottom: DS.Spacing.xxl,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.md,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  previewAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewContent: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text3,
  },
  previewCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  previewCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  warningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: DS.Radius.md,
    padding: DS.Spacing.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: DS.Radius.md,
    padding: DS.Spacing.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

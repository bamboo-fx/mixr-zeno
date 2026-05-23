import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';
import type { DrinkingPreference, RelationshipStatus, YearInSchool } from '@/lib/types';
import Slider from '@react-native-community/slider';

const YEAR_OPTIONS: { value: YearInSchool; label: string }[] = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'grad', label: 'Graduate' },
  { value: 'other', label: 'Other' },
];

const DRINKING_OPTIONS: { value: DrinkingPreference; label: string }[] = [
  { value: 'sober', label: 'Sober' },
  { value: 'light', label: 'Light' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'heavy', label: 'Heavy' },
];

const RELATIONSHIP_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'taken', label: 'Taken' },
  { value: 'complicated', label: "It's Complicated" },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [yearInSchool, setYearInSchool] = useState<YearInSchool | undefined>(profile?.yearInSchool);
  const [drinkingPreference, setDrinkingPreference] = useState<DrinkingPreference>(
    profile?.drinkingPreference ?? 'flexible'
  );
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(
    profile?.relationshipStatus ?? 'single'
  );
  const [personalityIndex, setPersonalityIndex] = useState(
    (profile?.personalityIndex ?? 0.5) * 100
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await api.profiles.update(profile.id, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        yearInSchool,
        drinkingPreference,
        relationshipStatus,
        personalityIndex: personalityIndex / 100,
      });

      updateProfile(updatedProfile);
      Haptics.success();
      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Haptics.error();
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <GelBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={DS.Color.gelPurple} />
        </View>
      </GelBackground>
    );
  }

  return (
    <GelBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={DS.Color.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={DS.Color.bg} />
            ) : (
              <Check size={20} color={DS.Color.bg} />
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Name</Text>
            <GelCard padding={0}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.textInput}
                placeholder="Your name"
                placeholderTextColor={DS.Color.text3}
                maxLength={50}
              />
            </GelCard>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            <GelCard padding={0}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[styles.textInput, styles.bioInput]}
                placeholder="Tell others about yourself..."
                placeholderTextColor={DS.Color.text3}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
              />
            </GelCard>
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          {/* Year in School */}
          <View style={styles.section}>
            <Text style={styles.label}>Year in School</Text>
            <View style={styles.optionsGrid}>
              {YEAR_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    Haptics.tap();
                    setYearInSchool(option.value);
                  }}
                  style={[
                    styles.optionChip,
                    yearInSchool === option.value && styles.optionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      yearInSchool === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Drinking Preference */}
          <View style={styles.section}>
            <Text style={styles.label}>Drinking Preference</Text>
            <View style={styles.optionsRow}>
              {DRINKING_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    Haptics.tap();
                    setDrinkingPreference(option.value);
                  }}
                  style={[
                    styles.optionChip,
                    styles.optionChipFlex,
                    drinkingPreference === option.value && styles.optionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      drinkingPreference === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Relationship Status */}
          <View style={styles.section}>
            <Text style={styles.label}>Relationship Status</Text>
            <View style={styles.optionsGrid}>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    Haptics.tap();
                    setRelationshipStatus(option.value);
                  }}
                  style={[
                    styles.optionChip,
                    relationshipStatus === option.value && styles.optionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      relationshipStatus === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Personality Index */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>Vibe Level</Text>
              <Text style={styles.sliderValue}>{Math.round(personalityIndex)}</Text>
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Chill</Text>
              <Text style={styles.sliderLabelText}>Wild</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={personalityIndex}
              onValueChange={setPersonalityIndex}
              minimumTrackTintColor={DS.Color.gelPurple}
              maximumTrackTintColor={DS.Color.glass}
              thumbTintColor={DS.Color.gelPurple}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GelBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: DS.Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.Color.text,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.gelPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.md,
  },
  section: {
    marginBottom: DS.Spacing.xl,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.Color.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: DS.Spacing.sm,
  },
  textInput: {
    color: DS.Color.text,
    fontSize: 16,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
  },
  bioInput: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: DS.Color.text3,
    textAlign: 'right',
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  optionChipFlex: {
    flex: 1,
    alignItems: 'center',
  },
  optionChipSelected: {
    backgroundColor: DS.Color.gelPurple,
    borderColor: DS.Color.gelPurple,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.Spacing.sm,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.Color.gelPurple,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: DS.Color.text3,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

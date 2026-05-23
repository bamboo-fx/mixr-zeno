import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe,
  Clock,
  Check,
  ImageIcon,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { uploadFile } from '@/lib/upload';

type PickerMode = 'date' | 'time' | null;
type PickerTarget = 'start-date' | 'start-time' | 'end-time' | null;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_W = (SCREEN_WIDTH - DS.Spacing.lg * 2 - 8 * 2) / 3;

// Background image definitions
export type BgKey =
  | 'outdoor'
  | 'creative'
  | 'party'
  | 'game-night'
  | 'volunteer'
  | 'sports'
  | 'wellness'
  | 'study-day'
  | 'poker'
  | 'movie'
  | 'study-night';

export const BACKGROUND_IMAGES: {
  key: BgKey;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: any;
}[] = [
  { key: 'poker',      label: 'Poker Night',   source: require('../../assets/images/mixer-bg-poker.png') },
  { key: 'party',      label: 'Party',         source: require('../../assets/images/mixer-bg-party.png') },
  { key: 'sports',     label: 'Sports',        source: require('../../assets/images/mixer-bg-sports.png') },
  { key: 'game-night', label: 'Game Night',    source: require('../../assets/images/mixer-bg-game-night.png') },
  { key: 'movie',      label: 'Movie Night',   source: require('../../assets/images/mixer-bg-movie.png') },
  { key: 'creative',   label: 'Creative',      source: require('../../assets/images/mixer-bg-creative.png') },
  { key: 'outdoor',    label: 'Outdoor',       source: require('../../assets/images/mixer-bg-outdoor.png') },
  { key: 'wellness',   label: 'Wellness',      source: require('../../assets/images/mixer-bg-wellness.png') },
  { key: 'study-day',  label: 'Study (Day)',   source: require('../../assets/images/mixer-bg-study-day.png') },
  { key: 'study-night',label: 'Study (Night)', source: require('../../assets/images/mixer-bg-study-night.png') },
  { key: 'volunteer',  label: 'Volunteer',     source: require('../../assets/images/mixer-bg-volunteer.png') },
];

export default function CreateOpenMixerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activity, setActivity] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledStart, setScheduledStart] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [scheduledEnd, setScheduledEnd] = useState<Date | null>(null);
  const [maxCapacity, setMaxCapacity] = useState(20);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [tempDate, setTempDate] = useState(scheduledStart);
  const [selectedBg, setSelectedBg] = useState<BgKey | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

  const isValid = title.trim().length >= 3 && location.trim().length >= 2;

  const selectedBgEntry = selectedBg ? BACKGROUND_IMAGES.find((b) => b.key === selectedBg) ?? null : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Not authenticated');
      const activityTrimmed = activity.trim();
      const descTrimmed = description.trim();
      const combinedDescription = [activityTrimmed, descTrimmed].filter(Boolean).join('\n') || undefined;

      await api.openMixers.create({
        title: title.trim(),
        description: combinedDescription,
        hostId: profile.id,
        location: location.trim(),
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd?.toISOString(),
        maxCapacity,
        backgroundImage: selectedBg ?? undefined,
        imageUrl: customImageUrl ?? undefined,
      });
    },
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['open-mixers'] });
      router.back();
    },
    onError: () => Haptics.error(),
  });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const openPicker = (target: PickerTarget) => {
    const mode: PickerMode = target === 'start-date' ? 'date' : 'time';
    if (target === 'end-time') {
      setTempDate(scheduledEnd ?? new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000));
    } else {
      setTempDate(scheduledStart);
    }
    setPickerTarget(target);
    setPickerMode(mode);
  };

  const confirmPicker = () => {
    if (pickerTarget === 'start-date' || pickerTarget === 'start-time') {
      setScheduledStart(tempDate);
    } else if (pickerTarget === 'end-time') {
      setScheduledEnd(tempDate);
    }
    setPickerMode(null);
    setPickerTarget(null);
    Haptics.tap();
  };

  return (
    <GelBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{
          paddingTop: insets.top + DS.Spacing.md,
          paddingHorizontal: DS.Spacing.lg,
          paddingBottom: DS.Spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: DS.Stroke.hairline,
          borderBottomColor: DS.Color.stroke,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: DS.Color.glassDark,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: DS.Stroke.hairline, borderColor: DS.Color.stroke,
            }}
          >
            <X size={18} color={DS.Color.text2} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Globe size={16} color={DS.Color.gelPurple} />
            <Text style={{ color: DS.Color.text, fontSize: 17, fontWeight: '800' }}>Create Open Mixer</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: DS.Spacing.lg, paddingBottom: DS.Spacing.lg, gap: DS.Spacing.md }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Background Image Picker */}
          <Animated.View entering={FadeInDown.delay(30).springify()}>
            <Pressable onPress={() => { Haptics.tap(); setShowBgPicker(true); }}>
              <View style={{
                borderRadius: 18, overflow: 'hidden', height: 170,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Background content: custom upload, preset, or empty */}
                {customImageUrl ? (
                  <Image source={{ uri: customImageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                ) : selectedBgEntry ? (
                  <Image source={selectedBgEntry.source} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    <ImageIcon size={32} color="rgba(255,255,255,0.25)" />
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' }}>Add Background</Text>
                  </View>
                )}

                {/* Dark scrim — only when an image is shown */}
                {(customImageUrl || selectedBgEntry) && (
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                    start={{ x: 0, y: 0.3 }}
                    end={{ x: 0, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                )}

                {/* Change/Add label */}
                <View style={{
                  position: 'absolute', bottom: 12, right: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
                }}>
                  <ImageIcon size={13} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {customImageUrl || selectedBgEntry ? 'Change Background' : 'Add Background'}
                  </Text>
                </View>

                {/* Label badge — only for presets */}
                {selectedBgEntry && !customImageUrl && (
                  <View style={{
                    position: 'absolute', top: 12, left: 12,
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 100,
                    backgroundColor: 'rgba(0,0,0,0.50)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{selectedBgEntry.label}</Text>
                  </View>
                )}

                {/* Upload spinner overlay */}
                {isUploadingImage && (
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <GelCard>
              <Text style={fieldLabelStyle}>Mixer Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Poker Night, Board Game Vibes, Champagne & Shackles..."
                placeholderTextColor={DS.Color.text3 + '80'}
                style={inputStyle}
                maxLength={100}
                returnKeyType="next"
              />
            </GelCard>
          </Animated.View>

          {/* Activity */}
          <Animated.View entering={FadeInDown.delay(90).springify()}>
            <GelCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={14} color={DS.Color.gelPurple} />
                <Text style={fieldLabelStyle}>Activity</Text>
              </View>
              <TextInput
                value={activity}
                onChangeText={setActivity}
                placeholder="What will people be doing? e.g. Flip cup tournament, trivia night..."
                placeholderTextColor={DS.Color.text3 + '80'}
                style={[inputStyle, { height: 60, textAlignVertical: 'top', paddingTop: 2 }]}
                multiline
                maxLength={200}
              />
            </GelCard>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <GelCard>
              <Text style={fieldLabelStyle}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Any extra details, dress code, what to bring..."
                placeholderTextColor={DS.Color.text3 + '80'}
                style={[inputStyle, { height: 72, textAlignVertical: 'top', paddingTop: 4 }]}
                multiline
                maxLength={500}
              />
            </GelCard>
          </Animated.View>

          {/* Location */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <GelCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MapPin size={14} color={DS.Color.gelPurple} />
                <Text style={fieldLabelStyle}>Location *</Text>
              </View>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Delta House, 123 Greek Row..."
                placeholderTextColor={DS.Color.text3 + '80'}
                style={inputStyle}
                maxLength={200}
              />
            </GelCard>
          </Animated.View>

          {/* Date & Time */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <GelCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Calendar size={14} color={DS.Color.gelPurple} />
                <Text style={fieldLabelStyle}>Date & Time *</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => { Haptics.tap(); openPicker('start-date'); }}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: 7,
                    paddingVertical: 13, paddingHorizontal: 14,
                    backgroundColor: 'rgba(168,85,247,0.10)',
                    borderRadius: 14, borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.35)',
                  }}
                >
                  <Calendar size={13} color={DS.Color.gelPurple} />
                  <Text style={{ color: DS.Color.text, fontWeight: '700', fontSize: 13 }}>
                    {formatDate(scheduledStart)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.tap(); openPicker('start-time'); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: 7,
                    paddingVertical: 13, paddingHorizontal: 16,
                    backgroundColor: 'rgba(168,85,247,0.10)',
                    borderRadius: 14, borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.35)',
                  }}
                >
                  <Clock size={13} color={DS.Color.gelPurple} />
                  <Text style={{ color: DS.Color.text, fontWeight: '700', fontSize: 13 }}>
                    {formatTime(scheduledStart)}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 10 }}>
                <Clock size={14} color={DS.Color.text3} />
                <Text style={[fieldLabelStyle, { marginBottom: 0 }]}>End Time</Text>
              </View>
              <Pressable
                onPress={() => { Haptics.tap(); openPicker('end-time'); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  paddingVertical: 13, paddingHorizontal: 16,
                  backgroundColor: scheduledEnd ? 'rgba(168,85,247,0.10)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 14, borderWidth: 1,
                  borderColor: scheduledEnd ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.12)',
                  alignSelf: 'flex-start',
                }}
              >
                <Clock size={13} color={scheduledEnd ? DS.Color.gelPurple : DS.Color.text3} />
                <Text style={{ color: scheduledEnd ? DS.Color.text : DS.Color.text3, fontWeight: '700', fontSize: 13 }}>
                  {scheduledEnd ? formatTime(scheduledEnd) : 'Set end time (optional)'}
                </Text>
                {scheduledEnd && (
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); setScheduledEnd(null); Haptics.tap(); }}
                    hitSlop={10}
                    style={{ marginLeft: 4 }}
                  >
                    <X size={13} color={DS.Color.text3} />
                  </Pressable>
                )}
              </Pressable>
            </GelCard>
          </Animated.View>

          {/* Max Capacity */}
          <Animated.View entering={FadeInDown.delay(210).springify()}>
            <GelCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Users size={14} color={DS.Color.gelPurple} />
                  <Text style={fieldLabelStyle}>Max Spots</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Pressable
                    onPress={() => { Haptics.tap(); setMaxCapacity((c) => Math.max(2, c - 2)); }}
                    style={stepperBtnStyle}
                  >
                    <ChevronDown size={18} color={DS.Color.text2} />
                  </Pressable>
                  <View style={{ minWidth: 44, alignItems: 'center' }}>
                    <Text style={{ color: DS.Color.text, fontWeight: '800', fontSize: 22 }}>{maxCapacity}</Text>
                  </View>
                  <Pressable
                    onPress={() => { Haptics.tap(); setMaxCapacity((c) => Math.min(200, c + 2)); }}
                    style={stepperBtnStyle}
                  >
                    <ChevronUp size={18} color={DS.Color.text2} />
                  </Pressable>
                </View>
              </View>
            </GelCard>
          </Animated.View>

        </ScrollView>

        {/* Fixed bottom submit button */}
        <View style={{
          paddingHorizontal: DS.Spacing.lg,
          paddingBottom: insets.bottom + DS.Spacing.md,
          paddingTop: DS.Spacing.sm,
          borderTopWidth: DS.Stroke.hairline,
          borderTopColor: DS.Color.stroke,
          backgroundColor: 'transparent',
        }}>
          <Pressable
            onPress={() => {
              if (!isValid || createMutation.isPending) return;
              Haptics.medium();
              createMutation.mutate();
            }}
            disabled={!isValid || createMutation.isPending}
            style={{ borderRadius: DS.Radius.md, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={isValid ? ['#A855F7', '#7C3AED'] : ['rgba(55,65,81,0.6)', 'rgba(55,65,81,0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 18,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 10,
              }}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Globe size={18} color={isValid ? '#fff' : DS.Color.text3} />
                  <Text style={{ color: isValid ? '#fff' : DS.Color.text3, fontWeight: '800', fontSize: 16, letterSpacing: 0.3 }}>
                    Create Open Mixer
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Background picker modal */}
      <Modal
        visible={showBgPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBgPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowBgPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={80} tint="dark" style={{
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              overflow: 'hidden',
              borderWidth: 1, borderBottomWidth: 0,
              borderColor: 'rgba(255,255,255,0.12)',
            }}>
              <LinearGradient
                colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ paddingBottom: insets.bottom + 24 }}
              >
                {/* Handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>

                {/* Header */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingBottom: 16,
                  borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
                }}>
                  <Text style={{ color: DS.Color.text3, fontSize: 13, fontWeight: '600' }}>Choose Background</Text>
                  <Pressable onPress={() => setShowBgPicker(false)} hitSlop={12}>
                    <X size={18} color={DS.Color.text2} />
                  </Pressable>
                </View>

                {/* Grid */}
                <ScrollView
                  contentContainerStyle={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    padding: DS.Spacing.lg,
                    gap: 8,
                  }}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 420 }}
                >
                  {/* Upload your own photo tile */}
                  <Pressable
                    onPress={async () => {
                      Haptics.tap();
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 0.85,
                        allowsEditing: true,
                      });
                      if (result.canceled) return;
                      const asset = result.assets[0];
                      if (!asset) return;
                      setShowBgPicker(false);
                      setIsUploadingImage(true);
                      try {
                        const filename = asset.fileName ?? `bg-${Date.now()}.jpg`;
                        const mimeType = asset.mimeType ?? 'image/jpeg';
                        const uploaded = await uploadFile(asset.uri, filename, mimeType);
                        setCustomImageUrl(uploaded.url);
                        setSelectedBg(null);
                      } catch {
                        Alert.alert('Upload failed', 'Could not upload your photo. Please try again.');
                      } finally {
                        setIsUploadingImage(false);
                      }
                    }}
                    style={{
                      width: THUMB_W,
                      height: THUMB_W * 0.6 + 28,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: customImageUrl ? 2.5 : 1,
                      borderColor: customImageUrl ? '#A855F7' : 'rgba(255,255,255,0.18)',
                      backgroundColor: 'rgba(168,85,247,0.10)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {customImageUrl ? (
                      <>
                        <Image source={{ uri: customImageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Check size={16} color="#fff" strokeWidth={3} />
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>My Photo</Text>
                        </View>
                        <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#A855F7', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={22} color="rgba(168,85,247,0.8)" />
                        <Text style={{ color: 'rgba(168,85,247,0.9)', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>Upload Photo</Text>
                      </>
                    )}
                  </Pressable>

                  {BACKGROUND_IMAGES.map((bg) => {
                    const isSelected = selectedBg === bg.key && !customImageUrl;
                    return (
                      <Pressable
                        key={bg.key}
                        onPress={() => {
                          Haptics.tap();
                          setSelectedBg(bg.key);
                          setCustomImageUrl(null);
                          setShowBgPicker(false);
                        }}
                        style={{
                          width: THUMB_W,
                          borderRadius: 12,
                          overflow: 'hidden',
                          borderWidth: isSelected ? 2.5 : 1,
                          borderColor: isSelected ? '#A855F7' : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        <Image
                          source={bg.source}
                          style={{ width: '100%', height: THUMB_W * 0.6 }}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            paddingVertical: 6, paddingHorizontal: 6,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                            {bg.label}
                          </Text>
                        </LinearGradient>
                        {isSelected && (
                          <View style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 20, height: 20, borderRadius: 10,
                            backgroundColor: '#A855F7',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={12} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date / Time picker modal */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setPickerMode(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={80} tint="dark" style={{
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0,
              borderColor: 'rgba(255,255,255,0.12)',
            }}>
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ paddingBottom: insets.bottom + 16 }}
              >
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
                }}>
                  <Pressable onPress={() => { setPickerMode(null); setPickerTarget(null); }} hitSlop={12}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' }}>Cancel</Text>
                  </Pressable>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    {pickerMode === 'date' ? 'Select Date' : pickerTarget === 'end-time' ? 'Select End Time' : 'Select Time'}
                  </Text>
                  <Pressable onPress={confirmPicker} hitSlop={12}>
                    <Text style={{ color: DS.Color.gelPurple, fontSize: 15, fontWeight: '700' }}>Confirm</Text>
                  </Pressable>
                </View>
                {pickerMode !== null && (
                  <DateTimePicker
                    value={tempDate}
                    mode={pickerMode}
                    display={pickerMode === 'date' ? 'inline' : 'spinner'}
                    minimumDate={pickerTarget === 'end-time' ? scheduledStart : new Date()}
                    themeVariant="dark"
                    style={{ alignSelf: 'center' }}
                    onChange={(_, date) => {
                      if (date) setTempDate(date);
                      if (Platform.OS === 'android') {
                        if (date) {
                          if (pickerTarget === 'end-time') setScheduledEnd(date);
                          else setScheduledStart(date);
                        }
                        setPickerMode(null);
                        setPickerTarget(null);
                      }
                    }}
                  />
                )}
              </LinearGradient>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </GelBackground>
  );
}

const fieldLabelStyle = {
  color: DS.Color.text3,
  fontSize: 11,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.9,
  marginBottom: 10,
};

const inputStyle = {
  color: DS.Color.text,
  fontSize: 15,
  fontWeight: '500' as const,
  paddingVertical: 0,
};

const stepperBtnStyle = {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: DS.Color.glassDark,
  borderWidth: DS.Stroke.hairline,
  borderColor: DS.Color.stroke,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

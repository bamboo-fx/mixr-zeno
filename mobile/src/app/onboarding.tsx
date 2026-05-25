import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  Sparkles,
  User,
  Heart,
  Zap,
  Star,
  GraduationCap,
  ArrowRight,
  Camera,
  ImageIcon,
  Plus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, G, ClipPath, Rect, Defs } from 'react-native-svg';
import Animated, {
  FadeInRight,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import Slider from '@react-native-community/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/use-session';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { MetalButton } from '@/components/gel/MetalButton';
import { GlassCard } from '@/components/gel/GlassCard';
import { Badge } from '@/components/gel/Badge';
import { Haptics } from '@/lib/haptics';
import type {
  DrinkingPreference,
  RelationshipStatus,
  YearInSchool,
  Interest,
} from '@/lib/types';

const TOTAL_STEPS = 6;

// College logo imports
const COLLEGE_LOGOS = {
  cmc: require('../../assets/images/cmc-logo.png'),
  pomona: require('../../assets/images/pomona-logo.png'),
  hmc: require('../../assets/images/hmc-logo.png'),
  scripps: require('../../assets/images/scripps-logo.png'),
  pitzer: require('../../assets/images/pitzer-logo.png'),
};

const COLLEGE_OPTIONS = [
  { name: 'Claremont McKenna College', abbr: 'CMC', id: 'cmc01', logo: COLLEGE_LOGOS.cmc },
  { name: 'Pomona College', abbr: 'POM', id: 'pom01', logo: COLLEGE_LOGOS.pomona },
  { name: 'Harvey Mudd College', abbr: 'HMC', id: 'hmc01', logo: COLLEGE_LOGOS.hmc },
  { name: 'Scripps College', abbr: 'SCR', id: 'scr01', logo: COLLEGE_LOGOS.scripps },
  { name: 'Pitzer College', abbr: 'PIT', id: 'pit01', logo: COLLEGE_LOGOS.pitzer },
];

const YEAR_OPTIONS: { value: YearInSchool; label: string }[] = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
];

const DRINKING_OPTIONS: { value: DrinkingPreference; label: string; emoji: string }[] = [
  { value: 'sober', label: 'Sober', emoji: '💧' },
  { value: 'light', label: 'Light', emoji: '🌿' },
  { value: 'heavy', label: 'Drink', emoji: '🍻' },
];

const RELATIONSHIP_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'taken', label: 'Taken' },
  { value: 'complicated', label: "It's Complicated" },
];

const STEP_META = [
  { title: 'Add a photo', subtitle: 'Add a photo so others can recognize you' },
  { title: 'Who are you?', subtitle: 'Tell us a bit about yourself' },
  { title: 'Your college', subtitle: 'Which of the 5Cs do you attend?' },
  { title: 'Your vibe', subtitle: 'How do you like to spend your time?' },
  { title: 'Your interests', subtitle: 'Pick things that get you excited' },
  { title: "You're all set!", subtitle: "Welcome to Mixr — let's find your groups" },
];

// Shimmering star component with 4-point star shape (matches sign-in page)
function SparklingStar({ size, top, left, right, delay }: { size: 'large' | 'medium' | 'small'; top: string; left?: string; right?: string; delay: number }) {
  const opacity = useSharedValue(size === 'large' ? 0.9 : size === 'medium' ? 0.7 : 0.5);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const baseSize = size === 'large' ? 16 : size === 'medium' ? 10 : 6;

  useEffect(() => {
    // Shimmer opacity animation
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(size === 'large' ? 1 : size === 'medium' ? 0.85 : 0.7, { duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Pulse scale animation
    scale.value = withDelay(
      delay + 200,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1000 + Math.random() * 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.2, { duration: 1000 + Math.random() * 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Slow rotation for sparkle effect
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(45, { duration: 3000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowColor = size === 'large' ? '#7AECC4' : size === 'medium' ? '#3AE3A0' : '#9333EA';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: baseSize,
          height: baseSize,
          top: top as `${number}%`,
          left: left as `${number}%` | undefined,
          right: right as `${number}%` | undefined,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle
      ]}
    >
      {/* Vertical beam */}
      <View
        style={{
          position: 'absolute',
          width: baseSize * 0.15,
          height: baseSize,
          backgroundColor: '#FFFFFF',
          borderRadius: baseSize * 0.1,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: baseSize * 0.5,
        }}
      />
      {/* Horizontal beam */}
      <View
        style={{
          position: 'absolute',
          width: baseSize,
          height: baseSize * 0.15,
          backgroundColor: '#FFFFFF',
          borderRadius: baseSize * 0.1,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: baseSize * 0.5,
        }}
      />
      {/* Center glow */}
      <View
        style={{
          position: 'absolute',
          width: baseSize * 0.35,
          height: baseSize * 0.35,
          backgroundColor: '#FFFFFF',
          borderRadius: baseSize,
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: baseSize * 0.3,
        }}
      />
    </Animated.View>
  );
}

// Delegates to the shared MetalButton component
function LiquidGlassContinueButton({
  onPress,
  children,
  disabled = false,
  isLoading = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <MetalButton
      variant="primary"
      onPress={onPress}
      disabled={disabled || isLoading}
      fullWidth
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        children
      )}
    </MetalButton>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = useSession();
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Step 0 state — profile picture
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Step 1 state
  const [yearInSchool, setYearInSchool] = useState<YearInSchool | undefined>(undefined);

  // Step 2 state — college
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | undefined>(undefined);

  // Step 3 state
  const [drinkingPreference, setDrinkingPreference] = useState<DrinkingPreference>('flexible');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('single');
  const [vibeLevel, setVibeLevel] = useState(50);

  // Step 4 state
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  // Progress bar animation
  const progressWidth = useSharedValue((1 / TOTAL_STEPS) * 100);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const { data: interests = [], isLoading: interestsLoading } = useQuery<Interest[]>({
    queryKey: ['interests'],
    queryFn: () => api.interests.list(),
  });

  const createInterestMutation = useMutation({
    mutationFn: (name: string) => api.interests.create(name),
    onSuccess: (newInterest) => {
      queryClient.invalidateQueries({ queryKey: ['interests'] });
      // Auto-select the newly created interest
      setSelectedInterestIds((prev) => [...prev, newInterest.id]);
      Haptics.success();
    },
  });

  const advanceStep = () => {
    const next = step + 1;
    if (next >= TOTAL_STEPS) return;
    Haptics.tap();
    setStep(next);
    progressWidth.value = withTiming(((next + 1) / TOTAL_STEPS) * 100, { duration: 300 });
  };

  const goBack = () => {
    const prev = step - 1;
    if (prev < 0) return;
    Haptics.tap();
    setStep(prev);
    progressWidth.value = withTiming(((prev + 1) / TOTAL_STEPS) * 100, { duration: 300 });
  };

  const toggleInterest = (id: string) => {
    Haptics.selection();
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Image picker functions for profile photo
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.success();
      setAvatarUri(result.assets[0].uri);
      setAvatarAsset(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.success();
      setAvatarUri(result.assets[0].uri);
      setAvatarAsset(result.assets[0]);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      if (!session?.user) {
        Haptics.success();
        router.replace('/sign-in');
        return;
      }

      let profile = await api.profiles.getByEmail(session.user.email).catch(() => null);
      if (!profile) {
        profile = await api.profiles.create({
          email: session.user.email,
          name: session.user.name,
        });
      }

      const collegeId = selectedCollegeId;

      const updatedProfile = await api.profiles.update(profile.id, {
        yearInSchool,
        drinkingPreference,
        relationshipStatus,
        personalityIndex: vibeLevel / 100,
        ...(collegeId ? { collegeId } : {}),
      });

      // Upload avatar if selected
      if (avatarAsset) {
        const rawMime = avatarAsset.mimeType ?? 'image/jpeg';
        const mime = (rawMime === 'image/heic' || rawMime === 'image/heif') ? 'image/jpeg' : rawMime;
        const file = {
          uri: avatarAsset.uri,
          type: mime,
          name: `avatar-${Date.now()}.jpg`,
        };
        await api.profileMedia.uploadAvatar(profile.id, file);
      }

      if (selectedInterestIds.length > 0) {
        await api.profiles.setInterests(profile.id, selectedInterestIds);
      }

      const finalProfile = await api.profiles.getByEmail(session.user.email).catch(() => updatedProfile);
      setProfile(finalProfile ?? updatedProfile);
      Haptics.success();
      router.replace('/(app)');
    } catch (err) {
      console.error('Onboarding save failed:', err);
      Haptics.error();
      router.replace('/(app)');
    } finally {
      setIsSaving(false);
    }
  };

  const userName = session?.user?.name?.split(' ')[0] ?? 'there';
  const stepMeta = STEP_META[step];

  return (
    <View style={styles.container}>
      {/* Purple starry night gradient background */}
      <LinearGradient
        colors={['#1a0a2e', '#120820', '#0a0515', '#050208']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Sparkling stars layer */}
      <View style={styles.starsContainer}>
        {/* Large sparkling stars */}
        <SparklingStar size="large" top="8%" left="15%" delay={0} />
        <SparklingStar size="large" top="12%" right="20%" delay={500} />
        <SparklingStar size="large" top="25%" left="80%" delay={1000} />
        <SparklingStar size="large" top="45%" left="8%" delay={1500} />
        <SparklingStar size="large" top="60%" right="12%" delay={2000} />
        <SparklingStar size="large" top="88%" left="35%" delay={2500} />
        <SparklingStar size="large" top="92%" right="40%" delay={3000} />

        {/* Medium sparkling stars */}
        <SparklingStar size="medium" top="5%" left="45%" delay={200} />
        <SparklingStar size="medium" top="18%" left="30%" delay={700} />
        <SparklingStar size="medium" top="15%" right="35%" delay={1200} />
        <SparklingStar size="medium" top="35%" left="25%" delay={1700} />
        <SparklingStar size="medium" top="40%" right="30%" delay={2200} />
        <SparklingStar size="medium" top="55%" left="40%" delay={2700} />
        <SparklingStar size="medium" top="70%" left="18%" delay={3200} />
        <SparklingStar size="medium" top="75%" right="25%" delay={3700} />
        <SparklingStar size="medium" top="82%" left="60%" delay={4200} />
        <SparklingStar size="medium" top="95%" left="12%" delay={4700} />

        {/* Small sparkling stars */}
        <SparklingStar size="small" top="3%" left="25%" delay={100} />
        <SparklingStar size="small" top="7%" right="40%" delay={400} />
        <SparklingStar size="small" top="10%" left="60%" delay={600} />
        <SparklingStar size="small" top="20%" left="12%" delay={900} />
        <SparklingStar size="small" top="22%" right="15%" delay={1100} />
        <SparklingStar size="small" top="30%" left="50%" delay={1400} />
        <SparklingStar size="small" top="38%" left="70%" delay={1600} />
        <SparklingStar size="small" top="48%" right="45%" delay={1900} />
        <SparklingStar size="small" top="52%" left="22%" delay={2100} />
        <SparklingStar size="small" top="65%" right="35%" delay={2400} />
        <SparklingStar size="small" top="72%" left="55%" delay={2600} />
        <SparklingStar size="small" top="80%" left="10%" delay={2900} />
        <SparklingStar size="small" top="85%" right="18%" delay={3100} />
        <SparklingStar size="small" top="90%" left="48%" delay={3400} />
        <SparklingStar size="small" top="78%" right="8%" delay={3600} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top bar: back + skip */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          {step > 0 ? (
            <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
              <ChevronLeft size={22} color="#7AECC4" />
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          {/* Skip button */}
          {(step === 0 || step === 3) ? (
            <Pressable onPress={advanceStep} style={styles.skipBtn} hitSlop={12}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipBtnPlaceholder} />
          )}
        </View>

        {/* Progress bar - Glassmorphic Raised Style */}
        <View style={styles.progressBarWrapper}>
          {/* Outer glow/shadow for floating effect */}
          <View style={styles.progressBarOuterGlow} />
          <View style={styles.progressBarGlassContainer}>
            <BlurView intensity={20} tint="dark" style={styles.progressTrackBlur}>
              <View style={styles.progressTrackInner}>
                {/* Top curved highlight */}
                <View style={styles.progressBarTopCurve}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ flex: 1 }}
                  />
                </View>

                {/* Progress fill */}
                <Animated.View style={[styles.progressFill, progressStyle]}>
                  <LinearGradient
                    colors={['#7AECC4', '#3AE3A0', '#9333EA', '#28C988']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFillGradient}
                  />
                  {/* Glow effect on fill */}
                  <View style={styles.progressFillGlow} />
                  {/* Shine on fill */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)', 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.progressFillShine}
                  />
                </Animated.View>
              </View>
            </BlurView>

            {/* Outer border ring */}
            <View style={styles.progressBarBorderOuter} />
            {/* Inner border */}
            <View style={styles.progressBarBorderInner} />
          </View>
        </View>

        {/* Step Content */}
        <Animated.View
          key={`step-${step}`}
          entering={FadeInRight.duration(280).springify()}
          style={styles.stepContainer}
          pointerEvents="box-none"
        >
          {/* Step header */}
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <Text style={styles.stepTitle}>{stepMeta.title}</Text>
              {step === 4 && <Text style={styles.fieldLabelVisible}>visible</Text>}
            </View>
            <Text style={styles.stepSubtitle}>{stepMeta.subtitle}</Text>
          </View>

          {/* Step body */}
          {step === 0 && (
            <StepPhoto
              avatarUri={avatarUri}
              onPickImage={pickImage}
              onTakePhoto={takePhoto}
            />
          )}
          {step === 1 && (
            <Step1
              yearInSchool={yearInSchool}
              setYearInSchool={setYearInSchool}
            />
          )}
          {step === 2 && (
            <StepCollege
              selectedCollegeId={selectedCollegeId}
              setSelectedCollegeId={setSelectedCollegeId}
            />
          )}
          {step === 3 && (
            <Step2
              drinkingPreference={drinkingPreference}
              setDrinkingPreference={setDrinkingPreference}
              relationshipStatus={relationshipStatus}
              setRelationshipStatus={setRelationshipStatus}
            />
          )}
          {step === 4 && (
            <Step3
              interests={interests}
              isLoading={interestsLoading}
              selectedIds={selectedInterestIds}
              toggle={toggleInterest}
              onCreateInterest={(name) => createInterestMutation.mutate(name)}
              isCreating={createInterestMutation.isPending}
            />
          )}
          {step === 5 && <Step4 userName={userName} />}
        </Animated.View>

        {/* Bottom CTA - Liquid Glass Button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          {step < TOTAL_STEPS - 1 ? (
            <LiquidGlassContinueButton onPress={advanceStep}>
              <Text style={styles.glassBtnText}>Continue</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </LiquidGlassContinueButton>
          ) : (
            <LiquidGlassContinueButton onPress={handleFinish} disabled={isSaving} isLoading={isSaving}>
              <Text style={styles.glassBtnText}>Let's go!</Text>
            </LiquidGlassContinueButton>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Step 0 — Profile Photo
interface StepPhotoProps {
  avatarUri: string | null;
  onPickImage: () => void;
  onTakePhoto: () => void;
}

function StepPhoto({ avatarUri, onPickImage, onTakePhoto }: StepPhotoProps) {
  // Animated values for liquid glass bubble
  const shimmerRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Slow rotation for iridescent color shift
    shimmerRotation.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );
    // Subtle breathing/pulse effect
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.985, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shimmerRotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.photoStepContainer}>
      {/* Liquid Glass Bubble */}
      <Pressable onPress={onPickImage} style={styles.bubbleWrapper}>
        {/* Main bubble container with pulse animation */}
        <Animated.View style={[styles.bubbleMainContainer, pulseStyle]}>
          {/* Outer iridescent ring - thin rainbow edge */}
          <Animated.View style={[styles.bubbleIridescentRing, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(233,213,255,0.7)',  // purple-100
                'rgba(216,180,254,0.65)', // purple-200
                'rgba(192,132,252,0.7)',  // purple-400
                'rgba(168,85,247,0.65)',  // purple-500
                'rgba(147,51,234,0.7)',   // purple-600
                'rgba(126,34,206,0.65)',  // purple-700
                'rgba(107,33,168,0.7)',   // purple-800
                'rgba(233,213,255,0.7)',  // back to purple-100
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleIridescentGradient}
            />
          </Animated.View>

          {/* Glass sphere with blur - TRANSLUCENT */}
          <View style={styles.bubbleGlassSphere}>
            <BlurView intensity={40} tint="dark" style={styles.bubbleBlurFill}>
              {/* Very subtle tint overlay */}
              <View style={styles.bubbleGlassTint}>
                {/* Content area */}
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.bubbleAvatarImage} />
                ) : (
                  <View style={styles.bubblePlaceholder}>
                    <Image
                      source={require('../../assets/images/profile-placeholder.png')}
                      style={styles.bubblePlaceholderIcon}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Inner rim highlight */}
                <View style={styles.bubbleInnerRimHighlight} />

                {/* Fresnel edge glow - brighter at edges */}
                <View style={styles.bubbleFresnelEdge} />
              </View>
            </BlurView>
          </View>

          {/* Outer rim glow */}
          <View style={styles.bubbleOuterRimGlow} />
        </Animated.View>

        {/* Edit badge */}
        <View style={styles.bubbleEditBadge}>
          <LinearGradient
            colors={['#7AECC4', '#3AE3A0', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleEditBadgeGradient}
          >
            <Camera size={18} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </Pressable>

      {/* Choose Photo Button - Dark Glassmorphic Pill Style */}
      <View style={styles.photoButtonSingle}>
        <Pressable onPress={onPickImage} style={styles.photoButtonWrapperFull}>
          {/* Outer glow/shadow for floating effect */}
          <View style={styles.photoBtnOuterGlow} />
          {/* Main glass pill */}
          <View style={styles.photoBtnMain}>
            <BlurView intensity={20} tint="dark" style={styles.photoBtnBlurLayer}>
              <View style={styles.photoBtnDarkTint}>
                {/* Top curved highlight */}
                <View style={styles.photoBtnTopCurve}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.photoBtnTopCurveGradient}
                  />
                </View>
                {/* Left edge highlight */}
                <View style={styles.photoBtnLeftEdge} />
                {/* Right edge highlight */}
                <View style={styles.photoBtnRightEdge} />
                {/* Bottom inner shadow */}
                <View style={styles.photoBtnBottomInnerShadow} />
                {/* Content */}
                <View style={styles.photoBtnContentRow}>
                  <ImageIcon size={24} color="#7AECC4" />
                  <Text style={styles.photoBtnText}>Choose Photo</Text>
                </View>
              </View>
            </BlurView>
            {/* Outer border ring */}
            <View style={styles.photoBtnBorderOuter} />
            {/* Inner border */}
            <View style={styles.photoBtnBorderInner} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// Step 1 — Who are you?
interface Step1Props {
  yearInSchool: YearInSchool | undefined;
  setYearInSchool: (v: YearInSchool) => void;
}

// Liquid Glass Button Component - mimics iOS slider thumb effect
function LiquidGlassButton({
  selected,
  onPress,
  children,
  style,
  contentStyle,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.liquidButtonOuter, style]}>
      {/* Outer glow/shadow for floating effect */}
      <View style={[styles.liquidBtnOuterGlow, selected && styles.liquidBtnOuterGlowSelected]} />
      {/* Main glass container */}
      <View style={styles.liquidBtnMain}>
        <BlurView intensity={20} tint="dark" style={styles.liquidBtnBlurLayer}>
          <View style={[styles.liquidBtnDarkTint, selected && styles.liquidBtnDarkTintSelected]}>
            {/* Top curved highlight */}
            <View style={styles.liquidBtnTopCurve}>
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.liquidBtnTopCurveGradient}
              />
            </View>
            {/* Left edge highlight */}
            <View style={styles.liquidBtnLeftEdge} />
            {/* Right edge highlight */}
            <View style={styles.liquidBtnRightEdge} />
            {/* Bottom inner shadow */}
            <View style={styles.liquidBtnBottomInnerShadow} />
            {/* Content */}
            <View style={[styles.liquidBtnContent, contentStyle]}>
              {children}
            </View>
          </View>
        </BlurView>
        {/* Outer border ring */}
        <View style={[styles.liquidBtnBorderOuter, selected && styles.liquidBtnBorderOuterSelected]} />
        {/* Inner border */}
        <View style={[styles.liquidBtnBorderInner, selected && styles.liquidBtnBorderInnerSelected]} />
      </View>
    </Pressable>
  );
}

function Step1({ yearInSchool, setYearInSchool }: Step1Props) {
  return (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Year in School */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabelLarge}>Year in School</Text>
        <View style={{ gap: 10 }}>
          {YEAR_OPTIONS.map((opt) => {
            const selected = yearInSchool === opt.value;
            return (
              <GlassCard
                key={opt.value}
                selected={selected}
                title={opt.label}
                onPress={() => {
                  Haptics.tap();
                  setYearInSchool(opt.value);
                }}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// Step College
interface StepCollegeProps {
  selectedCollegeId: string | undefined;
  setSelectedCollegeId: (v: string) => void;
}

function StepCollege({ selectedCollegeId, setSelectedCollegeId }: StepCollegeProps) {
  return (
    <ScrollView
      style={styles.collegeContainer}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabelLarge}>Select Your College</Text>
        <View style={{ gap: 10 }}>
          {COLLEGE_OPTIONS.map((college) => {
            const isSelected = selectedCollegeId === college.id;
            return (
              <GlassCard
                key={college.id}
                selected={isSelected}
                title={college.name}
                onPress={() => {
                  Haptics.tap();
                  setSelectedCollegeId(college.id);
                }}
                icon={
                  <Image
                    source={college.logo}
                    style={styles.collegeLogoSmallImg}
                    resizeMode="cover"
                  />
                }
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// Step 2 — Your Vibe
interface Step2Props {
  drinkingPreference: DrinkingPreference;
  setDrinkingPreference: (v: DrinkingPreference) => void;
  relationshipStatus: RelationshipStatus;
  setRelationshipStatus: (v: RelationshipStatus) => void;
}

function Step2({
  drinkingPreference,
  setDrinkingPreference,
  relationshipStatus,
  setRelationshipStatus,
}: Step2Props) {
  return (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Drinking Preference */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>DRINKING PREFERENCE</Text>
          <Text style={styles.fieldLabelVisible}>visible</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {DRINKING_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              selected={drinkingPreference === opt.value}
              size="lg"
              onPress={() => {
                Haptics.tap();
                setDrinkingPreference(opt.value);
              }}
              style={{ flex: 1 }}
            >
              {opt.label}
            </Badge>
          ))}
        </View>
      </View>

      {/* Relationship Status */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>RELATIONSHIP STATUS</Text>
          <Text style={styles.fieldLabelVisible}>visible</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              selected={relationshipStatus === opt.value}
              size="lg"
              onPress={() => {
                Haptics.tap();
                setRelationshipStatus(opt.value);
              }}
            >
              {opt.label}
            </Badge>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// Step 3 — Interests
interface Step3Props {
  interests: Interest[];
  isLoading: boolean;
  selectedIds: string[];
  toggle: (id: string) => void;
  onCreateInterest: (name: string) => void;
  isCreating: boolean;
}

function Step3({ interests, isLoading, selectedIds, toggle, onCreateInterest, isCreating }: Step3Props) {
  const [customInterest, setCustomInterest] = useState('');
  const count = selectedIds.length;

  const handleCreateInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed.length > 0 && trimmed.length <= 50) {
      onCreateInterest(trimmed);
      setCustomInterest('');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#3AE3A0" size="large" />
        <Text style={styles.loadingText}>Loading interests...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Selection counter */}
      <View style={styles.interestCounter}>
        <View style={[styles.countBadge, count > 0 && styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, count > 0 && styles.countBadgeTextActive]}>
            {count} selected
          </Text>
        </View>
      </View>

      {/* Custom interest input */}
      <View style={styles.customInterestContainer}>
        <View style={styles.customInterestInputWrapper}>
          <LinearGradient
            colors={['rgba(168,85,247,0.15)', 'rgba(147,51,234,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <TextInput
            style={styles.customInterestInput}
            placeholder="Add your own interest..."
            placeholderTextColor="rgba(192,132,252,0.5)"
            value={customInterest}
            onChangeText={setCustomInterest}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleCreateInterest}
          />
          <Pressable
            onPress={handleCreateInterest}
            disabled={isCreating || customInterest.trim().length === 0}
            style={[
              styles.customInterestAddBtn,
              (isCreating || customInterest.trim().length === 0) && styles.customInterestAddBtnDisabled,
            ]}
          >
            <LinearGradient
              colors={
                customInterest.trim().length > 0
                  ? ['rgba(168,85,247,0.8)', 'rgba(147,51,234,0.7)']
                  : ['rgba(168,85,247,0.3)', 'rgba(147,51,234,0.2)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {isCreating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Plus size={20} color="#fff" strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Interests chips grid */}
      <View style={styles.interestsGrid}>
        {interests.map((interest) => (
          <Badge
            key={interest.id}
            selected={selectedIds.includes(interest.id)}
            size="md"
            onPress={() => toggle(interest.id)}
          >
            {interest.name}
          </Badge>
        ))}
      </View>
    </ScrollView>
  );
}

// Step 4 — Celebration
interface Step4Props {
  userName: string;
}

function Step4({ userName }: Step4Props) {
  return (
    <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.celebrationContainer} pointerEvents="box-none">
      {/* Emoji burst */}
      <View style={styles.emojiRing}>
        <LinearGradient
          colors={['rgba(168,85,247,0.4)', 'rgba(147,51,234,0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.celebrationEmoji}>🎉</Text>
      </View>

      <Text style={styles.celebrationTitle}>Hey {userName}!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08050d',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(147,51,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(147,51,234,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#3AE3A0',
  },
  dotDone: {
    backgroundColor: '#9333EA',
  },
  skipBtn: {
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  skipBtnPlaceholder: {
    width: 44,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(192,132,252,0.5)',
  },

  // Progress bar - Glassmorphic Raised Style
  progressBarWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    position: 'relative',
  },
  progressBarOuterGlow: {
    position: 'absolute',
    bottom: -4,
    left: '8%',
    right: '8%',
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  progressBarGlassContainer: {
    height: 14,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  progressTrackBlur: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressTrackInner: {
    flex: 1,
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    zIndex: 1,
  },
  progressTrackShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  progressBarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    pointerEvents: 'none',
  },
  progressBarBorderOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.4)',
    pointerEvents: 'none',
  },
  progressBarBorderInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
    pointerEvents: 'none',
  },
  progressTrackGlass: {
    height: 10,
    borderRadius: 10,
    padding: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(147,51,234,0.2)',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFillGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  progressFillGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  progressFillShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  progressBarGlow: {
    position: 'absolute',
    top: -4,
    left: '5%',
    right: '50%',
    height: 18,
    backgroundColor: 'transparent',
    shadowColor: '#7AECC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  // Step container
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E0DFF4',
    textAlign: 'center',
    fontFamily: 'PlayfairDisplay-Regular',
    letterSpacing: -0.64,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#7AECC4',
    textAlign: 'center',
  },

  // Scroll areas
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 24,
  },

  // Field groups
  fieldGroup: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7AECC4',
    letterSpacing: 0.5,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabelVisible: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(34,197,94,0.8)',
    letterSpacing: 0.3,
  },
  fieldLabelHidden: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.5)',
    letterSpacing: 0.3,
  },
  fieldLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9D5FF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  // Glass input
  glassInputBorder: {
    borderRadius: 16,
    padding: 1,
  },
  glassInputBlur: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  glassInputInner: {
    backgroundColor: 'rgba(10,5,20,0.6)',
    padding: 16,
  },
  bioInput: {
    color: '#f0e6ff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(192,132,252,0.4)',
    textAlign: 'right',
    marginTop: 8,
  },

  // Chips
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(147,51,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)',
    overflow: 'hidden',
  },
  chipFlex: {
    flex: 1,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: 'rgba(192,132,252,0.5)',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  // New swapped styles - unselected is bright purple, selected is dark
  chipUnselectedBright: {
    borderColor: 'rgba(192,132,252,0.6)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  chipSelectedDark: {
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.7)',
  },
  chipTextSelected: {
    color: '#f0e6ff',
  },
  chipTextBright: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipTextSelectedDark: {
    color: '#7AECC4',
  },
  chipEmoji: {
    fontSize: 14,
  },

  // Slider
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vibeValueBadge: {
    minWidth: 40,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(147,51,234,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  vibeValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7AECC4',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabelText: {
    fontSize: 13,
    color: 'rgba(192,132,252,0.5)',
  },
  slider: {
    width: '100%',
    height: 40,
  },

  // Interests
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(192,132,252,0.5)',
  },
  interestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInterestContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  customInterestInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(147,51,234,0.1)',
  },
  customInterestInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#E9D5FF',
    fontWeight: '500',
  },
  customInterestAddBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  customInterestAddBtnDisabled: {
    opacity: 0.5,
  },
  countBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(147,51,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)',
  },
  countBadgeActive: {
    borderColor: '#3AE3A0',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.5)',
  },
  countBadgeTextActive: {
    color: '#7AECC4',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(147,51,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)',
    overflow: 'hidden',
  },
  interestChipSelected: {
    borderColor: 'transparent',
  },
  // New swapped styles for interest chips - unselected is bright purple, selected is dark
  interestChipUnselectedBright: {
    borderColor: 'rgba(192,132,252,0.6)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  interestChipSelectedDark: {
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.7)',
    position: 'relative',
    zIndex: 1,
  },
  interestChipTextSelected: {
    color: '#FFFFFF',
  },
  interestChipTextBright: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interestChipTextSelectedDark: {
    color: '#7AECC4',
  },

  // Celebration
  celebrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  emojiRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  celebrationEmoji: {
    fontSize: 44,
    zIndex: 1,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E0DFF4',
    textAlign: 'center',
    fontFamily: 'PlayfairDisplay-Regular',
  },
  celebrationBody: {
    fontSize: 15,
    color: 'rgba(192,132,252,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  statPills: {
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(147,51,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)',
    overflow: 'hidden',
  },
  statPillBright: {
    borderColor: 'rgba(192,132,252,0.6)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  statPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.7)',
  },
  statPillTextBright: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    position: 'relative',
    zIndex: 1,
  },

  // Bottom bar + CTA button
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Star Button Styles
  starBtnWrapper: {
    position: 'relative',
  },
  starBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  starBtnDisabled: {
    opacity: 0.6,
  },
  starBtnGlow: {
    position: 'absolute',
    bottom: -4,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 24,
    shadowColor: '#28C988',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  starBtnContainer: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  starBtnGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  starBtnOrbitLight: {
    position: 'absolute',
    width: 110,
    height: 56,
    zIndex: 2,
  },
  starBtnOrbitGradient: {
    flex: 1,
    borderRadius: 28,
  },
  starBtnSvgContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    overflow: 'hidden',
    borderRadius: 28,
  },
  starBtnStarsContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  starDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  starBtnBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 4,
  },
  starBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  starBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Hyper-Realistic Liquid Glass Button Styles - Transparent with purple tint
  glassBtn: {
    position: 'relative',
  },
  glassBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  glassBtnDisabled: {
    opacity: 0.5,
  },
  glassBtnOuterGlow: {
    position: 'absolute',
    bottom: -2,
    left: '5%',
    right: '5%',
    height: 14,
    backgroundColor: 'transparent',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  glassBtnMain: {
    height: 56,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  glassBtnBlurLayer: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  glassBtnDarkTint: {
    flex: 1,
    backgroundColor: 'rgba(20,20,25,0.35)',
    borderRadius: 32,
    position: 'relative',
  },
  glassBtnTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  glassBtnTopCurveGradient: {
    flex: 1,
  },
  glassBtnLeftEdge: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassBtnRightEdge: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassBtnBottomInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  glassBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  glassBtnBorderOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  glassBtnBorderInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 31,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glassBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // New purple card styles for continue button (swapped from photo buttons)
  continueBtnWrapper: {
    position: 'relative',
  },
  continueBtnBorder: {
    borderRadius: 28,
    padding: 1,
  },
  continueBtnBlur: {
    borderRadius: 27,
    overflow: 'hidden',
  },
  continueBtnInner: {
    backgroundColor: 'rgba(120,50,180,0.08)',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
  },
  continueBtnShine: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
  },

  // Legacy Liquid Glass CTA styles (keep for compatibility)
  liquidGlassCta: {
    position: 'relative',
  },
  liquidGlassCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  liquidGlassCtaDisabled: {
    opacity: 0.5,
  },
  liquidGlassCtaShadow: {
    position: 'absolute',
    bottom: -3,
    left: '8%',
    right: '8%',
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  liquidGlassCtaContainer: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  liquidGlassCtaInsetShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  liquidGlassCtaBlur: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  liquidGlassCtaTopHighlight: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  liquidGlassCtaContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liquidGlassCtaBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  liquidGlassCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  continueBtn: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  continueBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    borderRadius: 50,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Glassmorphic Continue Button Styles
  glassContinueWrapper: {
    position: 'relative',
    borderRadius: 28,
  },
  glassContinuePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  glassContinueGlow: {
    position: 'absolute',
    bottom: -6,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 28,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  glassContinueGradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  glassContinueBlur: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  glassContinueInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 12,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassContinueHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  glassContinueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Liquid Glass Button Styles (transparent with purple hue)
  liquidGlassBtnWrapper: {
    position: 'relative',
    borderRadius: 32,
  },
  liquidGlassBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  liquidGlassBtnGlow: {
    position: 'absolute',
    bottom: -4,
    left: '15%',
    right: '15%',
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 32,
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  liquidGlassBtnBorder: {
    borderRadius: 32,
    padding: 1.5,
  },
  liquidGlassBtnBlur: {
    borderRadius: 30.5,
    overflow: 'hidden',
  },
  liquidGlassBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
    position: 'relative',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: 30.5,
  },
  liquidGlassBtnEdgeHighlight: {
    position: 'absolute',
    top: 1,
    left: '15%',
    right: '15%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  liquidGlassBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#E9D5FF',
    letterSpacing: 0.2,
  },

  // College step
  collegeCardWrapper: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  collegeCardWrapperSelected: {
    shadowColor: '#7AECC4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },

  // TRUE Liquid Glass Button Styles (like iOS slider thumb)
  liquidButtonOuter: {
    position: 'relative',
    marginBottom: 4,
  },
  liquidButtonBorder: {
    borderRadius: 22,
    padding: 1.5,
  },
  liquidButtonBlur: {
    borderRadius: 20.5,
    overflow: 'hidden',
  },
  liquidButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  liquidButtonInnerSelected: {
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  liquidButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 20.5,
    borderTopRightRadius: 20.5,
  },
  liquidButtonInnerHighlight: {
    position: 'absolute',
    top: 1,
    left: '12%',
    right: '12%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },
  liquidButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liquidButtonTextSelected: {
    color: '#7AECC4',
    textShadowColor: 'rgba(192,132,252,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  liquidButtonCheck: {
    position: 'absolute',
    right: 18,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(192,132,252,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  liquidButtonShadow: {
    position: 'absolute',
    bottom: -2,
    left: '10%',
    right: '10%',
    height: 8,
    backgroundColor: 'transparent',
    borderRadius: 20,
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  liquidButtonShadowSelected: {
    shadowColor: '#3AE3A0',
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  // New raised glassmorphic styles for liquid buttons (matching photo buttons)
  liquidBtnOuterGlow: {
    position: 'absolute',
    bottom: -4,
    left: '8%',
    right: '8%',
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  liquidBtnOuterGlowSelected: {
    shadowColor: '#9333EA',
    shadowOpacity: 0.6,
  },
  liquidBtnMain: {
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  liquidBtnBlurLayer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  liquidBtnDarkTint: {
    flex: 1,
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderRadius: 16,
    position: 'relative',
  },
  liquidBtnDarkTintSelected: {
    backgroundColor: 'rgba(147,51,234,0.2)',
  },
  liquidBtnTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  liquidBtnTopCurveGradient: {
    flex: 1,
  },
  liquidBtnLeftEdge: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  liquidBtnRightEdge: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  liquidBtnBottomInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  liquidBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  liquidBtnBorderOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  liquidBtnBorderOuterSelected: {
    borderColor: 'rgba(192,132,252,0.4)',
    borderTopColor: 'rgba(192,132,252,0.6)',
  },
  liquidBtnBorderInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
  },
  liquidBtnBorderInnerSelected: {
    borderColor: 'rgba(192,132,252,0.5)',
  },
  // College button styles - compact glassmorphic
  collegeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  collegeGrid: {
    gap: 8,
  },
  collegeButtonStyle: {
    marginBottom: 0,
  },
  collegeButtonContent: {
    justifyContent: 'flex-start',
  },
  collegeLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 4,
  },
  collegeLogoSmallSelected: {
    backgroundColor: '#FFFFFF',
  },
  collegeLogoSmallImg: {
    width: 36,
    height: 36,
  },
  collegeBtnWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  collegeBtnGlow: {
    position: 'absolute',
    bottom: -3,
    left: '8%',
    right: '8%',
    height: 12,
    backgroundColor: 'transparent',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  collegeBtnGlowSelected: {
    shadowColor: '#9333EA',
    shadowOpacity: 0.5,
  },
  collegeBtnMain: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  collegeBtnBlur: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  collegeBtnInner: {
    flex: 1,
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderRadius: 14,
    position: 'relative',
  },
  collegeBtnInnerSelected: {
    backgroundColor: 'rgba(147,51,234,0.2)',
  },
  collegeBtnTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  collegeBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    zIndex: 10,
  },
  collegeBtnLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  collegeBtnLogoSelected: {
    backgroundColor: '#FFFFFF',
  },
  collegeBtnLogoImage: {
    width: 26,
    height: 26,
  },
  collegeBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  collegeBtnTextSelected: {
    color: '#7AECC4',
  },
  collegeBtnCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(192,132,252,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collegeBtnBorderOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  collegeBtnBorderOuterSelected: {
    borderColor: 'rgba(192,132,252,0.4)',
    borderTopColor: 'rgba(192,132,252,0.6)',
  },
  collegeBtnBorderInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
  },
  collegeBtnBorderInnerSelected: {
    borderColor: 'rgba(192,132,252,0.5)',
  },
  // Liquid Glass College Button - Hyper-realistic bubble styles
  liquidCollegeBtnWrapper: {
    marginBottom: 8,
  },
  liquidCollegeBtnOuter: {
    position: 'relative',
  },
  liquidCollegeGlowDeep: {
    position: 'absolute',
    bottom: -6,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  liquidCollegeGlowDeepSelected: {
    shadowColor: '#28C988',
    shadowOpacity: 0.6,
  },
  liquidCollegeGlowMid: {
    position: 'absolute',
    bottom: -3,
    left: '5%',
    right: '5%',
    height: 14,
    backgroundColor: 'transparent',
    borderRadius: 18,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  liquidCollegeGlowMidSelected: {
    shadowColor: '#3AE3A0',
    shadowOpacity: 0.5,
  },
  liquidCollegeBtnMain: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  liquidCollegeIridescentBorder: {
    flex: 1,
    borderRadius: 18,
    padding: 1.5,
  },
  liquidCollegeBlur: {
    flex: 1,
    borderRadius: 16.5,
    overflow: 'hidden',
  },
  liquidCollegeGlassInner: {
    flex: 1,
    backgroundColor: 'rgba(25,20,35,0.5)',
    borderRadius: 16.5,
    position: 'relative',
    overflow: 'hidden',
  },
  liquidCollegeGlassInnerSelected: {
    backgroundColor: 'rgba(147,51,234,0.15)',
  },
  liquidCollegeSpecularTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 16.5,
    borderTopRightRadius: 16.5,
    overflow: 'hidden',
  },
  liquidCollegeSpecularGradient: {
    flex: 1,
  },
  liquidCollegeShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
  },
  liquidCollegeFresnelLeft: {
    position: 'absolute',
    left: 0,
    top: '10%',
    bottom: '10%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  liquidCollegeFresnelRight: {
    position: 'absolute',
    right: 0,
    top: '10%',
    bottom: '10%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
  },
  liquidCollegeBottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  liquidCollegeContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    zIndex: 10,
  },
  liquidCollegeLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  liquidCollegeLogoContainerSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3AE3A0',
    shadowOpacity: 0.3,
  },
  liquidCollegeLogoImg: {
    width: 28,
    height: 28,
  },
  liquidCollegeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liquidCollegeNameSelected: {
    color: '#E9D5FF',
    textShadowColor: 'rgba(168,85,247,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  liquidCollegeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(192,132,252,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquidCollegeRimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  liquidCollegeRimGlowSelected: {
    borderColor: 'rgba(192,132,252,0.3)',
    borderTopColor: 'rgba(233,213,255,0.5)',
  },
  liquidCollegeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
  },
  liquidCollegeLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  liquidCollegeLogoSelected: {
    backgroundColor: '#FFFFFF',
  },
  liquidCollegeLogoImage: {
    width: 36,
    height: 36,
  },
  liquidCollegeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liquidCollegeTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(192,132,252,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  collegeCardBorder: {
    borderRadius: 20,
    padding: 1.5,
  },
  collegeCardBlur: {
    borderRadius: 18.5,
    overflow: 'hidden',
  },
  collegeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(15,8,30,0.65)',
    padding: 18,
    paddingHorizontal: 20,
    borderRadius: 18.5,
    position: 'relative',
    overflow: 'hidden',
  },
  collegeCardInnerSelected: {
    backgroundColor: 'rgba(147,51,234,0.2)',
  },
  collegeGlossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%',
    borderRadius: 18.5,
  },
  collegeLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  collegeLogoSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#7AECC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  collegeLogoImage: {
    width: 40,
    height: 40,
  },
  collegeNameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#E9D5FF',
    zIndex: 1,
  },
  collegeNameTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(192,132,252,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  collegeCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },

  // Liquid glass buttons (like the slider thumb)
  liquidGlassGrid: {
    flexDirection: 'column',
    gap: 14,
  },
  liquidGlassWrapper: {
    borderRadius: 20,
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  liquidGlassWrapperSelected: {
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  liquidGlassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  liquidGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  liquidGlassText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    zIndex: 1,
  },
  liquidGlassTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  liquidGlassCheck: {
    position: 'absolute',
    right: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  liquidGlassCollegeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    gap: 14,
  },
  liquidGlassLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  liquidGlassLogoSelected: {
    backgroundColor: '#FFFFFF',
  },
  liquidGlassLogoImage: {
    width: 36,
    height: 36,
  },
  liquidGlassCollegeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    zIndex: 1,
  },
  liquidGlassCollegeTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Vibe-style liquid glass buttons for year in school
  vibeButtonsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  vibeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(147,51,234,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
  },
  vibeButtonSelected: {
    backgroundColor: 'rgba(168,85,247,0.35)',
    borderColor: 'rgba(192,132,252,0.6)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  vibeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7AECC4',
  },
  vibeButtonTextSelected: {
    color: '#FFFFFF',
  },
  vibeButtonCheck: {
    position: 'absolute',
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(168,85,247,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Vibe-style liquid glass college cards
  vibeCollegeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(147,51,234,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
    gap: 14,
  },
  vibeCollegeCardSelected: {
    backgroundColor: 'rgba(168,85,247,0.35)',
    borderColor: 'rgba(192,132,252,0.6)',
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  vibeCollegeLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vibeCollegeLogoSelected: {
    backgroundColor: '#FFFFFF',
  },
  vibeCollegeLogoImage: {
    width: 36,
    height: 36,
  },
  vibeCollegeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#7AECC4',
  },
  vibeCollegeTextSelected: {
    color: '#FFFFFF',
  },
  vibeCollegeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(168,85,247,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glass chips for year in school
  glassChipsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  glassChipWrapper: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  glassChipWrapperSelected: {
    shadowColor: '#7AECC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  glassChipBorder: {
    borderRadius: 24,
    padding: 1.5,
  },
  glassChipBlur: {
    borderRadius: 22.5,
    overflow: 'hidden',
  },
  glassChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: 'rgba(15,8,30,0.6)',
    borderRadius: 22.5,
    position: 'relative',
    overflow: 'hidden',
  },
  glassChipInnerSelected: {
    backgroundColor: 'rgba(147,51,234,0.25)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 22.5,
  },
  glassChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(192,132,252,0.8)',
    zIndex: 1,
  },
  glassChipTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(192,132,252,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  glassChipCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Step 0 — Profile Photo styles
  photoStepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 28,
  },
  avatarPreviewWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarPreviewBorder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 3,
  },
  avatarPreviewBlur: {
    flex: 1,
    borderRadius: 77,
    overflow: 'hidden',
  },
  avatarPreviewInner: {
    flex: 1,
    borderRadius: 77,
    backgroundColor: 'rgba(10,5,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 77,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3AE3A0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#08050d',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoButtonSingle: {
    marginTop: 16,
  },
  photoButtonWrapper: {
    flex: 1,
  },
  photoButtonWrapperFull: {
    width: '100%',
  },
  photoButtonBorder: {
    borderRadius: 20,
    padding: 1,
  },
  photoButtonBlur: {
    borderRadius: 19,
    overflow: 'hidden',
  },
  photoButtonInner: {
    backgroundColor: 'rgba(120,50,180,0.08)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
  },
  photoButtonShine: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
  },
  photoButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.25)',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F0E6FF',
  },
  // New dark glassmorphic pill styles for photo buttons
  photoBtnOuterGlow: {
    position: 'absolute',
    bottom: -4,
    left: '8%',
    right: '8%',
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  photoBtnMain: {
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  photoBtnBlurLayer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoBtnDarkTint: {
    flex: 1,
    backgroundColor: 'rgba(30,25,40,0.6)',
    borderRadius: 16,
    position: 'relative',
  },
  photoBtnTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  photoBtnTopCurveGradient: {
    flex: 1,
  },
  photoBtnLeftEdge: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoBtnRightEdge: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoBtnBottomInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  photoBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  photoBtnContentRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  photoBtnBorderOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  photoBtnBorderInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.3)',
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7AECC4',
    letterSpacing: 0.3,
  },
  photoHintText: {
    fontSize: 14,
    color: 'rgba(192,132,252,0.5)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Bubble Avatar Styles - Liquid Glass Translucent
  bubbleWrapper: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  bubbleMainContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubbleIridescentRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  bubbleIridescentGradient: {
    flex: 1,
    borderRadius: 90,
  },
  bubbleGlassSphere: {
    width: 168,
    height: 168,
    borderRadius: 84,
    overflow: 'hidden',
  },
  bubbleBlurFill: {
    flex: 1,
    borderRadius: 84,
  },
  bubbleGlassTint: {
    flex: 1,
    borderRadius: 84,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bubbleSpecularMain: {
    position: 'absolute',
    top: 10,
    left: 18,
    width: 55,
    height: 38,
    borderRadius: 28,
    transform: [{ rotate: '-20deg' }],
    overflow: 'hidden',
  },
  bubbleHighlightDot: {
    position: 'absolute',
    top: 20,
    right: 28,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  bubbleHighlightSmall: {
    position: 'absolute',
    top: 38,
    right: 42,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  bubbleAvatarImage: {
    width: '80%',
    height: '80%',
    borderRadius: 68,
    zIndex: 5,
  },
  bubblePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  bubblePlaceholderIcon: {
    width: 100,
    height: 100,
  },
  bubbleInnerRimHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 82,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bubbleFresnelEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bubbleOuterRimGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bubbleEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#08050d',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  bubbleEditBadgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

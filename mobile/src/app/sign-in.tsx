import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path, G, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors as C, fonts as F } from '@/lib/theme';

type Mode = 'signin' | 'signup';

function PulsingDot({ size = 8 }: { size?: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.mint,
          shadowColor: C.mint,
          shadowOpacity: 1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
        animStyle,
      ]}
    />
  );
}

function HeroBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="auth-emerald" cx="50%" cy="0%" rx="120%" ry="80%">
            <Stop offset="0%"  stopColor="#1a5d52" stopOpacity="1" />
            <Stop offset="25%" stopColor="#0a3530" stopOpacity="1" />
            <Stop offset="50%" stopColor="#061814" stopOpacity="1" />
            <Stop offset="85%" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="auth-crimson" cx="0%" cy="100%" rx="60%" ry="50%">
            <Stop offset="0%"  stopColor="#FF4D5E" stopOpacity="0.30" />
            <Stop offset="60%" stopColor="#FF4D5E" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="auth-amber" cx="100%" cy="100%" rx="70%" ry="50%">
            <Stop offset="0%"  stopColor="#3AE3A0" stopOpacity="0.22" />
            <Stop offset="60%" stopColor="#3AE3A0" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auth-emerald)" />
        <Rect width="100%" height="100%" fill="url(#auth-crimson)" />
        <Rect width="100%" height="100%" fill="url(#auth-amber)" />
      </Svg>
    </View>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </Svg>
  );
}

function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.24 0-1.43.66-2.18.47-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const invalidateSession = useInvalidateSession();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';
  const isEduEmail = email.trim().toLowerCase().endsWith('.edu');

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (isSignUp && !isEduEmail) {
      setError('Please use your .edu email address.');
      return;
    }
    setIsLoading(true);
    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split('@')[0]!,
        });
        if (result.error) {
          setError(result.error.message ?? 'Sign up failed. Please try again.');
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) {
          setError(result.error.message ?? 'Invalid credentials. Please try again.');
          return;
        }
      }
      await invalidateSession();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const ssoSoon = () => Alert.alert('Coming soon', 'Social sign-in is not enabled yet. Use your .edu email and password.');

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HERO ────────────────────────────────────────────────── */}
          <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
            <HeroBackdrop />
            <View style={styles.heroContent}>
              <View style={styles.logoMark}>
                <PulsingDot size={8} />
                <Text style={styles.logoText}>mixr</Text>
              </View>

              <Animated.View key={mode + 'eyebrow'} entering={FadeIn.duration(180)} style={styles.eyebrow}>
                <Text style={styles.eyebrowText}>
                  {isSignUp ? 'Built for the 5Cs' : '5C Claremont · .edu only'}
                </Text>
              </Animated.View>

              <Animated.Text key={mode + 'h'} entering={FadeIn.duration(180)} style={styles.heroH1}>
                {isSignUp ? (
                  <>Get on <Text style={[styles.heroH1, { color: C.crimson }]}>the list.</Text></>
                ) : (
                  <>Welcome <Text style={[styles.heroH1, { color: C.amber }]}>back.</Text></>
                )}
              </Animated.Text>

              <Text style={styles.heroSub}>
                {isSignUp
                  ? 'Plan mixers with your group, vote on themes, see who\'s out tonight.'
                  : 'Sign in to plan tonight, vote on themes, and see who\'s out.'}
              </Text>
            </View>
          </View>

          {/* ── BODY ────────────────────────────────────────────────── */}
          <View style={styles.body}>
            {/* Name (sign up only) */}
            {isSignUp && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Jess M."
                    placeholderTextColor={C.ink3}
                    autoCapitalize="words"
                    autoCorrect={false}
                    selectionColor={C.mint}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>School email</Text>
              <View style={[styles.inputWrap, isEduEmail && styles.inputWrapValid]}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@school.edu"
                  placeholderTextColor={C.ink3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={C.mint}
                />
                {isEduEmail && (
                  <View style={styles.inputSuffix}>
                    <Check size={12} color={C.mint} strokeWidth={3} />
                    <Text style={styles.suffixText}>{isSignUp ? 'valid' : '.edu'}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{isSignUp ? 'Create password' : 'Password'}</Text>
                {!isSignUp && <Text style={styles.fieldHint}>Forgot?</Text>}
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
                  placeholderTextColor={C.ink3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={C.mint}
                />
              </View>
            </View>

            {/* .edu verified info card (sign up) */}
            {isSignUp && (
              <View style={styles.eduBadge}>
                <View style={styles.eduBadgeIcon}>
                  <ShieldCheck size={14} color="#062a14" strokeWidth={2.6} />
                </View>
                <Text style={styles.eduBadgeText}>
                  <Text style={styles.eduBadgeStrong}>.edu verified. </Text>
                  Only Pomona, CMC, Scripps, Pitzer, and Mudd students can join.
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <Animated.View entering={FadeIn.duration(160)} style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* CTA */}
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, isLoading && styles.ctaDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color={C.bg} size="small" />
              ) : (
                <>
                  <Text style={styles.ctaText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                  <ArrowRight size={14} color={C.bg} strokeWidth={2.5} />
                </>
              )}
            </Pressable>

            {/* Legal (sign up only) */}
            {isSignUp && (
              <Text style={styles.legal}>
                By signing up, you agree to our <Text style={styles.legalLink}>Terms</Text> and <Text style={styles.legalLink}>Privacy Policy</Text>.
              </Text>
            )}

            {/* Switch */}
            <Pressable onPress={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(null); }} style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already on mixr? ' : 'New to mixr? '}
                <Text style={styles.switchLink}>{isSignUp ? 'Sign in →' : 'Create an account →'}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  heroContent: { position: 'relative' },
  logoMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  logoText: {
    fontFamily: F.bold,
    fontSize: 20,
    color: C.ink,
    letterSpacing: -0.8,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(58,227,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(58,227,160,0.30)',
    marginBottom: 18,
  },
  eyebrowText: {
    color: C.mint,
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  heroH1: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -1.25,
    marginBottom: 10,
  },
  heroSub: {
    color: C.ink2,
    fontFamily: F.medium,
    fontSize: 14,
    lineHeight: 21,
  },

  // Body
  body: {
    paddingHorizontal: 22,
    paddingTop: 24,
  },

  // SSO buttons
  sso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
  },
  ssoPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  ssoText: {
    color: C.ink,
    fontFamily: F.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  dividerText: {
    color: C.ink3,
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Field
  field: { marginBottom: 12 },
  fieldLabel: {
    color: C.ink3,
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldHint: {
    color: C.ink3,
    fontFamily: F.medium,
    fontSize: 12,
    marginBottom: 7,
  },
  inputWrap: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapValid: {
    borderColor: 'rgba(58,227,160,0.40)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.ink,
    fontFamily: F.medium,
    fontSize: 15,
    letterSpacing: -0.15,
  },
  inputSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 14,
  },
  suffixText: {
    color: C.mint,
    fontFamily: F.semibold,
    fontSize: 12,
  },

  // .edu badge
  eduBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(58,227,160,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(58,227,160,0.20)',
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 14,
  },
  eduBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduBadgeText: {
    flex: 1,
    color: C.ink2,
    fontFamily: F.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  eduBadgeStrong: { color: C.mint, fontFamily: F.bold },

  // Error
  errorBox: {
    backgroundColor: 'rgba(255,77,94,0.10)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  errorText: {
    color: C.crimson,
    fontFamily: F.semibold,
    fontSize: 13,
  },

  // CTA
  cta: {
    backgroundColor: C.ink,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: C.ink,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaPressed: { backgroundColor: '#E5E5E5' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    color: C.bg,
    fontFamily: F.bold,
    fontSize: 15,
    letterSpacing: -0.15,
  },

  // Legal
  legal: {
    color: C.ink3,
    fontFamily: F.medium,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 14,
  },
  legalLink: {
    color: C.ink2,
    textDecorationLine: 'underline',
  },

  // Switch
  switchRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: C.ink3,
    fontFamily: F.medium,
    fontSize: 13,
  },
  switchLink: {
    color: C.amber,
    fontFamily: F.semibold,
  },
});

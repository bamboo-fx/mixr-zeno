import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  UIManager,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Design tokens
const C = {
  bg: '#000000',
  surface: '#111111',
  surface2: '#181818',
  surface3: 'rgba(255,255,255,0.06)',
  ink: '#FFFFFF',
  ink2: '#888888',
  ink3: '#7A7A7A',
  amber: '#FF8547',
  crimson: '#FF405E',
} as const;

const F = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const invalidateSession = useInvalidateSession();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.85 },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setMode(newMode);
    setError(null);
  };

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
    if (isSignUp && !email.trim().toLowerCase().endsWith('.edu')) {
      setError('Please use your .edu email address');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (result.error) {
          setError(result.error.message ?? 'Sign up failed. Please try again.');
          return;
        }
        await invalidateSession();
        return;
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? 'Invalid credentials. Please try again.');
          return;
        }
      }
      await invalidateSession();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/images/mixr-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Hero */}
          <Text style={styles.hero}>
            {isSignUp ? (
              <>
                Join the <Text style={styles.heroAccent}>5C</Text> nights.
              </>
            ) : (
              <>
                Welcome back <Text style={styles.heroAccent}>to mixr.</Text>
              </>
            )}
          </Text>
          <Text style={styles.subhero}>
            {isSignUp
              ? 'Create your account with your .edu email.'
              : 'Sign in to plan your next mix.'}
          </Text>

          {/* Segmented control */}
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentTab, !isSignUp && styles.segmentTabActive]}
              onPress={() => handleModeSwitch('signin')}
            >
              <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentTab, isSignUp && styles.segmentTabActive]}
              onPress={() => handleModeSwitch('signup')}
            >
              <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>
                Sign up
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Alex Chen"
                  placeholderTextColor={C.ink3}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  selectionColor={C.crimson}
                />
              </Animated.View>
            )}

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@school.edu"
                placeholderTextColor={C.ink3}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={C.crimson}
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={C.ink3}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={C.crimson}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={12}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={C.ink2} strokeWidth={1.75} />
                  ) : (
                    <Eye size={18} color={C.ink2} strokeWidth={1.75} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, isLoading && styles.ctaDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <>
                <Text style={styles.ctaText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                <ArrowRight size={18} color={C.bg} strokeWidth={2.5} />
              </>
            )}
          </Pressable>

          {/* Footer toggle */}
          <Pressable onPress={() => handleModeSwitch(isSignUp ? 'signin' : 'signup')} style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account? ' : "New to mixr? "}
              <Text style={styles.footerLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  logoRow: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 40,
  },

  hero: {
    fontFamily: F.bold,
    fontSize: 36,
    lineHeight: 40,
    color: C.ink,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  heroAccent: {
    color: C.amber,
    fontFamily: F.bold,
  },
  subhero: {
    fontFamily: F.regular,
    fontSize: 15,
    color: C.ink2,
    marginBottom: 28,
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentTabActive: {
    backgroundColor: C.surface2,
  },
  segmentText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink3,
  },
  segmentTextActive: {
    color: C.ink,
  },

  form: {
    gap: 16,
    marginBottom: 16,
  },
  label: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.ink2,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    color: C.ink,
    fontFamily: F.regular,
    fontSize: 15,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  errorBox: {
    backgroundColor: 'rgba(255,64,94,0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.crimson,
  },

  cta: {
    backgroundColor: C.ink,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  ctaPressed: {
    backgroundColor: '#E5E5E5',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: C.bg,
    letterSpacing: -0.1,
  },

  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: F.regular,
    fontSize: 14,
    color: C.ink2,
  },
  footerLink: {
    fontFamily: F.semibold,
    color: C.ink,
  },
});

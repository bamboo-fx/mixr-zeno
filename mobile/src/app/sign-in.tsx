import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { MetalButton } from '@/components/gel/MetalButton';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Shimmering star component with 4-point star shape
function SparklingStar({ size, top, left, right, delay }: { size: 'large' | 'medium' | 'small'; top: string; left?: string; right?: string; delay: number }) {
  const opacity = useSharedValue(size === 'large' ? 0.9 : size === 'medium' ? 0.7 : 0.5);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const baseSize = size === 'large' ? 16 : size === 'medium' ? 10 : 6;

  useEffect(() => {
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

  const glowColor = size === 'large' ? '#C084FC' : size === 'medium' ? '#A855F7' : '#9333EA';

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
    // Smooth spring-like layout animation for height change
    LayoutAnimation.configureNext({
      duration: 280,
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
      {/* Purple starry night gradient background */}
      <LinearGradient
        colors={['#1a0a2e', '#120820', '#0a0515', '#050208']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Sparkling stars layer */}
      <View style={styles.starsContainer} pointerEvents="none">
        <SparklingStar size="large" top="8%" left="15%" delay={0} />
        <SparklingStar size="large" top="12%" right="20%" delay={500} />
        <SparklingStar size="large" top="25%" left="80%" delay={1000} />
        <SparklingStar size="large" top="45%" left="8%" delay={1500} />
        <SparklingStar size="large" top="60%" right="12%" delay={2000} />
        <SparklingStar size="large" top="88%" left="35%" delay={2500} />
        <SparklingStar size="large" top="92%" right="40%" delay={3000} />
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.contentWrapper,
            { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/mixr-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Tagline */}
          <Text style={styles.tagline}>The Social App For The 5C's</Text>

          {/* Glass Card */}
          <Animated.View entering={FadeIn.duration(600).delay(150)}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(147,51,234,0.3)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardBorder}
            >
              <BlurView intensity={60} tint="dark" style={styles.cardBlur}>
                <View style={styles.cardInner}>
                  {/* Shine line at top */}
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shineLine}
                  />

                  {/* Tabs */}
                  <View style={styles.tabs}>
                    <Pressable
                      style={[styles.tab, !isSignUp && styles.tabActive]}
                      onPress={() => handleModeSwitch('signin')}
                    >
                      {!isSignUp && <View style={styles.tabGlow} />}
                      <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Sign In</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, isSignUp && styles.tabActive]}
                      onPress={() => handleModeSwitch('signup')}
                    >
                      {isSignUp && <View style={styles.tabGlow} />}
                      <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Sign Up</Text>
                    </Pressable>
                  </View>

                  {/* Heading */}
                  <Text style={styles.heading}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
                  <Text style={styles.subheading}>
                    {isSignUp ? 'Join the exclusive 5C community' : 'Sign in to mix'}
                  </Text>

                  {/* Form */}
                  <View style={styles.form}>
                    {isSignUp && (
                      <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                      >
                        <LinearGradient
                          colors={['rgba(255,255,255,0.08)', 'rgba(147,51,234,0.2)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.inputBorder}
                        >
                          <View style={styles.inputInner}>
                            <User size={20} color="rgba(192,132,252,0.5)" strokeWidth={1.5} />
                            <TextInput
                              style={styles.input}
                              placeholder="Full name"
                              placeholderTextColor="rgba(192,132,252,0.4)"
                              value={name}
                              onChangeText={setName}
                              autoCapitalize="words"
                              autoCorrect={false}
                              selectionColor="#A855F7"
                            />
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    )}

                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(147,51,234,0.2)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.inputBorder}
                    >
                      <View style={styles.inputInner}>
                        <Mail size={20} color="rgba(192,132,252,0.5)" strokeWidth={1.5} />
                        <TextInput
                          style={styles.input}
                          placeholder="Email address"
                          placeholderTextColor="rgba(192,132,252,0.4)"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          selectionColor="#A855F7"
                        />
                      </View>
                    </LinearGradient>

                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(147,51,234,0.2)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.inputBorder}
                    >
                      <View style={styles.inputInner}>
                        <Lock size={20} color="rgba(192,132,252,0.5)" strokeWidth={1.5} />
                        <TextInput
                          style={styles.input}
                          placeholder="Password"
                          placeholderTextColor="rgba(192,132,252,0.4)"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          selectionColor="#A855F7"
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                          {showPassword ? (
                            <EyeOff size={20} color="rgba(192,132,252,0.5)" strokeWidth={1.5} />
                          ) : (
                            <Eye size={20} color="rgba(192,132,252,0.5)" strokeWidth={1.5} />
                          )}
                        </Pressable>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Error */}
                  {error && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* Submit Button */}
                  <MetalButton
                    variant="primary"
                    onPress={handleSubmit}
                    disabled={isLoading}
                    fullWidth
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                          {isSignUp ? 'Sign Up' : 'Sign In'}
                        </Text>
                        <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
                      </>
                    )}
                  </MetalButton>

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Toggle */}
                  <Pressable onPress={() => handleModeSwitch(isSignUp ? 'signin' : 'signup')}>
                    <Text style={styles.toggleText}>
                      {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                      <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
                      <Text style={styles.toggleArrow}> →</Text>
                    </Text>
                  </Pressable>
                </View>
              </BlurView>
            </LinearGradient>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  flex: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: -20,
    marginTop: -30,
  },
  logo: {
    width: 280,
    height: 140,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#C084FC',
    marginBottom: 24,
    marginTop: -10,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Card
  cardBorder: {
    borderRadius: 28,
    padding: 1,
  },
  cardBlur: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: 'rgba(120,50,180,0.08)',
    padding: 32,
    paddingTop: 36,
    position: 'relative',
  },
  shineLine: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 50,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: 'rgba(147,51,234,0.3)',
  },
  tabGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139,92,246,0.15)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(192,132,252,0.4)',
  },
  tabTextActive: {
    color: '#F0E6FF',
    fontWeight: '600',
  },

  // Heading
  heading: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E0DFF4',
    marginBottom: 8,
    fontFamily: 'PlayfairDisplay-Regular',
    letterSpacing: -0.64,
    lineHeight: 35,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: '#C084FC',
    marginBottom: 28,
    textAlign: 'center',
  },

  // Form
  form: {
    gap: 16,
    marginBottom: 20,
  },
  inputBorder: {
    borderRadius: 14,
    padding: 1,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,5,20,0.7)',
    borderRadius: 13,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#F0E6FF',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#F87171',
    textAlign: 'center',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(147,51,234,0.2)',
  },
  dividerText: {
    fontSize: 11,
    color: 'rgba(192,132,252,0.4)',
    letterSpacing: 2,
  },

  // Toggle
  toggleText: {
    fontSize: 14,
    color: 'rgba(192,132,252,0.5)',
    textAlign: 'center',
  },
  toggleLink: {
    color: '#F0E6FF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  toggleArrow: {
    color: '#F0E6FF',
  },
});

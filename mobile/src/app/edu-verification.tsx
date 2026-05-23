import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
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
import { ArrowLeft, Mail, CheckCircle, Send, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';

type VerificationState = 'input' | 'code' | 'verified';

export default function EduVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [state, setState] = useState<VerificationState>(
    profile?.eduVerified ? 'verified' : 'input'
  );
  const [email, setEmail] = useState(profile?.eduEmail ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (profile?.eduVerified) {
      setState('verified');
    }
  }, [profile?.eduVerified]);

  const isValidEduEmail = (email: string) => {
    return email.toLowerCase().endsWith('.edu') && email.includes('@');
  };

  const handleSendCode = async () => {
    if (!profile) return;

    if (!isValidEduEmail(email)) {
      setError('Please enter a valid .edu email address');
      Haptics.error();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.eduVerification.sendCode(profile.id, email);
      setExpiresAt(new Date(result.expiresAt));

      // In dev mode, show the code for testing
      if (result.devCode) {
        setDevCode(result.devCode);
      }

      setState('code');
      Haptics.success();

      // Focus code input
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
      setError(message);
      Haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!profile) return;

    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      Haptics.error();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.eduVerification.confirmCode(profile.id, code);

      // Update local profile state
      updateProfile({
        eduVerified: true,
        eduVerifiedAt: result.verifiedAt,
        eduEmail: result.eduEmail,
      });

      setState('verified');
      Haptics.success();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code';
      setError(message);
      Haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCode('');
    setError(null);
    setDevCode(null);
    setState('input');
  };

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
          <Text style={styles.headerTitle}>.edu Verification</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          {state === 'verified' ? (
            // Verified state
            <View style={styles.verifiedContainer}>
              <View style={styles.successIcon}>
                <CheckCircle size={64} color={DS.Color.success} />
              </View>
              <Text style={styles.verifiedTitle}>Email Verified!</Text>
              <Text style={styles.verifiedEmail}>{profile?.eduEmail}</Text>
              <Text style={styles.verifiedSubtext}>
                Your college email has been verified. You'll see a verification badge on your profile.
              </Text>
            </View>
          ) : state === 'input' ? (
            // Email input state
            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <Mail size={48} color={DS.Color.gelPurple} />
              </View>
              <Text style={styles.title}>Verify Your College Email</Text>
              <Text style={styles.subtitle}>
                Enter your .edu email address to verify you're a real college student.
              </Text>

              <GelCard padding={0} style={styles.inputCard}>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                  }}
                  placeholder="you@college.edu"
                  placeholderTextColor={DS.Color.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </GelCard>

              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color={DS.Color.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSendCode}
                disabled={loading || !email.trim()}
                style={[
                  styles.primaryButton,
                  (loading || !email.trim()) && styles.primaryButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            // Code input state
            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <Mail size={48} color={DS.Color.gelPurple} />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {email}
              </Text>

              {devCode && (
                <View style={styles.devCodeContainer}>
                  <Text style={styles.devCodeLabel}>DEV MODE - Your code:</Text>
                  <Text style={styles.devCodeValue}>{devCode}</Text>
                </View>
              )}

              <GelCard padding={0} style={styles.inputCard}>
                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={(text) => {
                    // Only allow digits
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setCode(cleaned);
                    setError(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor={DS.Color.text3}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                />
              </GelCard>

              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color={DS.Color.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleVerifyCode}
                disabled={loading || code.length !== 6}
                style={[
                  styles.primaryButton,
                  (loading || code.length !== 6) && styles.primaryButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                  </>
                )}
              </Pressable>

              <Pressable onPress={handleResend} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Use different email</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: DS.Spacing.lg,
    justifyContent: 'center',
  },
  formContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: DS.Color.text,
    textAlign: 'center',
    marginBottom: DS.Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: DS.Color.text2,
    textAlign: 'center',
    marginBottom: DS.Spacing.xl,
    lineHeight: 22,
  },
  inputCard: {
    width: '100%',
    marginBottom: DS.Spacing.md,
  },
  input: {
    color: DS.Color.text,
    fontSize: 16,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 16,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: DS.Spacing.md,
  },
  errorText: {
    color: DS.Color.error,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: DS.Color.gelPurple,
    borderRadius: DS.Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginTop: DS.Spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: DS.Spacing.lg,
    padding: DS.Spacing.md,
  },
  secondaryButtonText: {
    color: DS.Color.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  devCodeContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: DS.Radius.md,
    padding: DS.Spacing.md,
    marginBottom: DS.Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  devCodeLabel: {
    fontSize: 12,
    color: '#EAB308',
    fontWeight: '600',
    marginBottom: 4,
  },
  devCodeValue: {
    fontSize: 24,
    color: '#EAB308',
    fontWeight: '800',
    letterSpacing: 4,
  },
  verifiedContainer: {
    alignItems: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.xl,
  },
  verifiedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: DS.Color.text,
    marginBottom: DS.Spacing.sm,
  },
  verifiedEmail: {
    fontSize: 16,
    color: DS.Color.gelPurple,
    fontWeight: '600',
    marginBottom: DS.Spacing.md,
  },
  verifiedSubtext: {
    fontSize: 15,
    color: DS.Color.text2,
    textAlign: 'center',
    lineHeight: 22,
  },
});

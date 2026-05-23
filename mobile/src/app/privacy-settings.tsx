import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <GelBackground>
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
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>
          <GelCard>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Eye size={24} color={DS.Color.gelPurple} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Same College Only</Text>
                <Text style={styles.infoSubtext}>
                  Your full profile is only visible to students at your college.
                  Others see a limited view.
                </Text>
              </View>
            </View>
          </GelCard>
        </View>

        {/* Data Protection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection</Text>
          <GelCard>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Lock size={24} color={DS.Color.gelPurple} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Your Data is Protected</Text>
                <Text style={styles.infoSubtext}>
                  We use industry-standard encryption to protect your personal
                  information. Your data is never sold to third parties.
                </Text>
              </View>
            </View>
          </GelCard>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <GelCard>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>
                  Only share personal info with people you trust
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>
                  Meet in public places for first-time mixer events
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>
                  Report any suspicious or inappropriate behavior
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>
                  Trust your instincts - if something feels wrong, leave
                </Text>
              </View>
            </View>
          </GelCard>
        </View>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.Color.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: DS.Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: DS.Color.text2,
    lineHeight: 20,
  },
  tipsList: {
    gap: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.Color.gelPurple,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: DS.Color.text2,
    lineHeight: 20,
  },
});

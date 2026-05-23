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
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { GelBackground, GelCard } from '@/components/gel';
import type { Activity } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Zap,
  MessageSquare,
  GitPullRequest,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '@/lib/haptics';
import { MixerDateTimePicker } from '@/components/MixerDateTimePicker';

export default function EditMixerRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    mixerId,
    groupId,
    currentStart,
    currentEnd,
    currentLocation,
    currentActivityId,
  } = useLocalSearchParams<{
    mixerId: string;
    groupId: string;
    currentStart: string;
    currentEnd?: string;
    currentLocation: string;
    currentActivityId?: string;
  }>();

  const profile = useAuthStore((s) => s.profile);

  const [proposedStart, setProposedStart] = useState(
    currentStart ? new Date(currentStart) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [proposedEnd, setProposedEnd] = useState(
    currentEnd ? new Date(currentEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState(currentLocation ?? '');
  const [message, setMessage] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    currentActivityId ?? null
  );

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.activities.list(),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!profile || !mixerId || !groupId) throw new Error('Missing required data');
      return api.mixers.createChangeRequest(mixerId, {
        requestingGroupId: groupId,
        proposedStart: proposedStart.toISOString(),
        proposedEnd: proposedEnd.toISOString(),
        proposedLocation: location.trim() || 'TBD',
        proposedActivityId: selectedActivityId ?? undefined,
        message: message.trim() || undefined,
        createdById: profile.id,
      });
    },
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['mixer-change-requests', mixerId] });
      queryClient.invalidateQueries({ queryKey: ['mixer', mixerId] });
      router.back();
    },
    onError: () => {
      Haptics.error();
    },
  });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const canSubmit = location.trim().length > 0;

  return (
    <GelBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + DS.Spacing.sm }]}>
          <Pressable
            onPress={() => {
              Haptics.tap();
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={DS.Color.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <GitPullRequest size={16} color={DS.Color.gelPurple} />
            <Text style={styles.headerTitle}>Request Change</Text>
          </View>
          {canSubmit ? (
            <Pressable onPress={() => { Haptics.medium(); submitMutation.mutate(); }} disabled={submitMutation.isPending}>
              <LinearGradient
                colors={[...DS.Grad.gelGlow.colors]}
                start={DS.Grad.gelGlow.start}
                end={DS.Grad.gelGlow.end}
                style={styles.sendButton}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.sendButtonDisabled}>
              <Text style={styles.sendButtonTextDisabled}>Send</Text>
            </View>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <GitPullRequest size={14} color={DS.Color.gelPurple} />
            <Text style={styles.infoText}>
              The other group will need to approve your proposed changes before the mixer is updated.
            </Text>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When *</Text>

            {/* START */}
            <Text style={styles.startEndLabel}>START</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                onPress={() => { Haptics.tap(); setShowDatePicker(true); }}
                style={styles.dateTimeButton}
              >
                <Calendar size={16} color={DS.Color.gelPurple} />
                <Text style={styles.dateTimeText}>{formatDate(proposedStart)}</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.tap(); setShowTimePicker(true); }}
                style={[styles.dateTimeButton, styles.timeButton]}
              >
                <Text style={styles.dateTimeText}>{formatTime(proposedStart)}</Text>
              </Pressable>
            </View>

            {/* END */}
            <Text style={[styles.startEndLabel, { marginTop: 16 }]}>END</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                onPress={() => { Haptics.tap(); setShowEndDatePicker(true); }}
                style={styles.dateTimeButton}
              >
                <Calendar size={16} color={DS.Color.text3} />
                <Text style={styles.dateTimeText}>{formatDate(proposedEnd)}</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.tap(); setShowEndTimePicker(true); }}
                style={[styles.dateTimeButton, styles.timeButton]}
              >
                <Text style={styles.dateTimeText}>{formatTime(proposedEnd)}</Text>
              </Pressable>
            </View>

            <MixerDateTimePicker
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              value={proposedStart}
              onChange={(d) => setProposedStart(d)}
              minimumDate={new Date()}
              title="Start Date"
              mode="date"
            />
            <MixerDateTimePicker
              visible={showTimePicker}
              onClose={() => setShowTimePicker(false)}
              value={proposedStart}
              onChange={(d) => setProposedStart(d)}
              minimumDate={new Date()}
              title="Start Time"
              mode="time"
            />
            <MixerDateTimePicker
              visible={showEndDatePicker}
              onClose={() => setShowEndDatePicker(false)}
              value={proposedEnd}
              onChange={(d) => setProposedEnd(d)}
              minimumDate={proposedStart}
              title="End Date"
              mode="date"
            />
            <MixerDateTimePicker
              visible={showEndTimePicker}
              onClose={() => setShowEndTimePicker(false)}
              value={proposedEnd}
              onChange={(d) => setProposedEnd(d)}
              minimumDate={proposedStart}
              title="End Time"
              mode="time"
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where *</Text>
            <GelCard padding={0}>
              <View style={styles.inputRow}>
                <MapPin size={18} color={DS.Color.text3} />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location..."
                  placeholderTextColor={DS.Color.text3}
                  style={styles.textInput}
                />
              </View>
            </GelCard>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Activity (Optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesRow}
            >
              <Pressable
                onPress={() => { Haptics.tap(); setSelectedActivityId(null); }}
                style={[styles.activityChip, !selectedActivityId && styles.activityChipSelected]}
              >
                <Zap size={14} color={!selectedActivityId ? DS.Color.gelPurple : DS.Color.text3} />
                <Text style={[styles.activityChipText, !selectedActivityId && styles.activityChipTextSelected]}>
                  Random
                </Text>
              </Pressable>
              {activities.slice(0, 6).map((activity: Activity) => {
                const isSelected = selectedActivityId === activity.id;
                return (
                  <Pressable
                    key={activity.id}
                    onPress={() => { Haptics.tap(); setSelectedActivityId(isSelected ? null : activity.id); }}
                    style={[styles.activityChip, isSelected && styles.activityChipSelected]}
                  >
                    <Text style={[styles.activityChipText, isSelected && styles.activityChipTextSelected]}>
                      {activity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message (Optional)</Text>
            <GelCard padding={0}>
              <View style={styles.messageInputRow}>
                <MessageSquare size={18} color={DS.Color.text3} />
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Explain why you're requesting this change..."
                  placeholderTextColor={DS.Color.text3}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.messageInput}
                  maxLength={200}
                />
              </View>
            </GelCard>
            <Text style={styles.charCount}>{message.length}/200</Text>
          </View>

          {submitMutation.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Failed to send request. Please try again.</Text>
            </View>
          )}
        </ScrollView>
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
    borderBottomWidth: DS.Stroke.hairline,
    borderBottomColor: DS.Color.stroke,
  },
  backButton: {
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
  sendButton: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sendButtonDisabled: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl,
    backgroundColor: DS.Color.glass,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonTextDisabled: {
    color: DS.Color.text3,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.Spacing.sm,
    backgroundColor: DS.Color.gelPurple + '18',
    borderRadius: DS.Radius.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.gelPurple + '40',
    padding: DS.Spacing.md,
    marginBottom: DS.Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: DS.Color.gelPurple,
    fontWeight: '500',
    lineHeight: 18,
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
  startEndLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.Color.text3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: DS.Radius.md,
    backgroundColor: DS.Color.glass,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  timeButton: {
    flex: 1,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: DS.Color.text,
  },
  activitiesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  activityChip: {
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
  activityChipSelected: {
    backgroundColor: DS.Color.gelPurple + '20',
    borderColor: DS.Color.gelPurple,
  },
  activityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  activityChipTextSelected: {
    color: DS.Color.gelPurple,
    fontWeight: '700',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 14,
  },
  messageInput: {
    flex: 1,
    fontSize: 15,
    color: DS.Color.text,
    minHeight: 60,
  },
  charCount: {
    fontSize: 11,
    color: DS.Color.text3,
    textAlign: 'right',
    marginTop: 4,
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

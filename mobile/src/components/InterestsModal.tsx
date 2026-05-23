import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, Search, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import type { Interest } from '@/lib/types';

const MAX_INTERESTS = 12;

interface InterestsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedInterestIds: string[];
  onSave: (interestIds: string[]) => Promise<void>;
}

export function InterestsModal({
  visible,
  onClose,
  selectedInterestIds,
  onSave,
}: InterestsModalProps) {
  const insets = useSafeAreaInsets();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedInterestIds));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(selectedInterestIds));
      loadInterests();
    }
  }, [visible, selectedInterestIds]);

  const loadInterests = async () => {
    try {
      const data = await api.interests.list();
      setInterests(data);
    } catch (error) {
      console.error('Failed to load interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (id: string) => {
    Haptics.tap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_INTERESTS) {
        next.add(id);
      } else {
        Haptics.warning();
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      Haptics.success();
      onClose();
    } catch (error) {
      console.error('Failed to save interests:', error);
      Haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const filteredInterests = interests.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedInterests = interests.filter((i) => selected.has(i.id));
  const unselectedInterests = filteredInterests.filter((i) => !selected.has(i.id));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={DS.Color.text} />
          </Pressable>
          <Text style={styles.title}>Select Interests</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={DS.Color.bg} />
            ) : (
              <Check size={20} color={DS.Color.bg} />
            )}
          </Pressable>
        </View>

        {/* Counter */}
        <Text style={styles.counter}>
          {selected.size}/{MAX_INTERESTS} selected
        </Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color={DS.Color.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search interests..."
            placeholderTextColor={DS.Color.text3}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={DS.Color.gelPurple} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Selected interests */}
            {selectedInterests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Selected</Text>
                <View style={styles.chipsContainer}>
                  {selectedInterests.map((interest) => (
                    <Pressable
                      key={interest.id}
                      onPress={() => toggleInterest(interest.id)}
                      style={[styles.chip, styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, styles.chipTextSelected]}>
                        {interest.name}
                      </Text>
                      <X size={14} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Available interests */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {search ? 'Results' : 'All Interests'}
              </Text>
              <View style={styles.chipsContainer}>
                {unselectedInterests.map((interest) => (
                  <Pressable
                    key={interest.id}
                    onPress={() => toggleInterest(interest.id)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{interest.name}</Text>
                  </Pressable>
                ))}
                {unselectedInterests.length === 0 && (
                  <Text style={styles.emptyText}>
                    {search ? 'No matching interests' : 'All interests selected'}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
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
  counter: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
    marginBottom: DS.Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.Color.glass,
    marginHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.lg,
    paddingHorizontal: DS.Spacing.md,
    borderRadius: DS.Radius.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  searchInput: {
    flex: 1,
    color: DS.Color.text,
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: DS.Spacing.lg,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  chipSelected: {
    backgroundColor: DS.Color.gelPurple,
    borderColor: DS.Color.gelPurple,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: DS.Color.text3,
    fontStyle: 'italic',
  },
});

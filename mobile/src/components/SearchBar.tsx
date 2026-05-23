import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { DS } from '@/lib/ds';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Search size={18} color={DS.Color.text3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={DS.Color.text3}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    paddingHorizontal: DS.Spacing.md,
    paddingVertical: DS.Spacing.sm + 2,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: DS.Color.text,
  },
});

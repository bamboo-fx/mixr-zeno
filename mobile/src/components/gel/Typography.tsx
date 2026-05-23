import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
}

export function PageTitle({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[styles.pageTitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[styles.sectionTitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function Subtitle({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[styles.subtitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function Label({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[styles.label, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(216,180,254,0.7)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#A855F7',
  },
});

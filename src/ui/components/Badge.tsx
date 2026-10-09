import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEME } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: THEME.colors.sosRed, border: 'rgba(239, 68, 68, 0.3)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: THEME.colors.nearAmber, border: 'rgba(245, 158, 11, 0.3)' };
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: THEME.colors.immediateGreen, border: 'rgba(16, 185, 129, 0.3)' };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: THEME.colors.radarBlue, border: 'rgba(59, 130, 246, 0.3)' };
      case 'neutral':
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: THEME.colors.textMuted, border: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...THEME.typography.badge,
  },
});

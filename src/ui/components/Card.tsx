import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { THEME } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'glow' | 'danger';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', ...props }) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'glow' && styles.cardGlow,
        variant === 'danger' && styles.cardDanger,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radii.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.xs,
  },
  cardGlow: {
    borderColor: THEME.colors.radarBlue,
    shadowColor: THEME.colors.radarBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardDanger: {
    borderColor: THEME.colors.sosRed,
    shadowColor: THEME.colors.sosRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
});

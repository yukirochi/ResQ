import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../../ui/theme';

interface SosButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

export const SosButton: React.FC<SosButtonProps> = ({ isActive, onToggle }) => {
  return (
    <View style={styles.container}>
      {/* Outer Beacon Glow Rings */}
      {isActive && (
        <>
          <View style={[styles.glowRing, styles.glowRingOuter]} />
          <View style={[styles.glowRing, styles.glowRingMiddle]} />
        </>
      )}

      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.85}
        style={[styles.button, isActive ? styles.buttonActive : styles.buttonIdle]}
      >
        <Text style={styles.sosText}>{isActive ? 'SOS ACTIVE' : 'PRESS SOS'}</Text>
        <Text style={styles.statusSubtitle}>
          {isActive ? 'BROADCASTING BEACON' : 'TAP IN EMERGENCY'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.lg,
    position: 'relative',
    height: 240,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: THEME.colors.sosGlow,
  },
  glowRingOuter: {
    width: 250,
    height: 250,
    opacity: 0.3,
  },
  glowRingMiddle: {
    width: 215,
    height: 215,
    opacity: 0.55,
  },
  button: {
    width: 175,
    height: 175,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
  },
  buttonIdle: {
    backgroundColor: THEME.colors.surfaceCard,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
  },
  buttonActive: {
    backgroundColor: THEME.colors.sosRed,
    borderColor: '#FCA5A5',
    shadowColor: THEME.colors.sosRed,
  },
  sosText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  statusSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});

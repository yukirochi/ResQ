import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useModeStore } from '../../store/modeStore';
import { THEME } from '../theme';

interface HeaderProps {
  title?: string;
  onOpenSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenSimulator }) => {
  const { mode, isSimulating, setMode } = useModeStore();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.brandTitle}>ResQ</Text>
          <View style={styles.offlinePill}>
            <View style={styles.statusDot} />
            <Text style={styles.offlineText}>OFFLINE P2P BLE</Text>
          </View>
        </View>

        <View style={styles.controls}>
          {onOpenSimulator && (
            <TouchableOpacity
              onPress={onOpenSimulator}
              style={[styles.simButton, isSimulating && styles.simButtonActive]}
            >
              <Text style={styles.simText}>SIMULATOR</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setMode('NONE')}
            style={styles.switchModeButton}
          >
            <Text style={styles.switchModeText}>CHANGE MODE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {title && <Text style={styles.pageTitle}>{title}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: THEME.colors.sosRed,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.immediateGreen,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.immediateGreen,
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  simButtonActive: {
    borderColor: THEME.colors.radarBlue,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  simText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.radarBlue,
  },
  switchModeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchModeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  pageTitle: {
    ...THEME.typography.title,
    marginTop: THEME.spacing.sm,
  },
});

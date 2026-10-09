import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictimStatusCondition } from '../../../types';
import { THEME } from '../../../ui/theme';

interface StatusChipsProps {
  currentCondition: VictimStatusCondition;
  onSelectCondition: (condition: VictimStatusCondition) => void;
  disabled?: boolean;
}

interface ChipItem {
  key: VictimStatusCondition;
  label: string;
  emoji: string;
  urgent?: boolean;
}

const CHIPS: ChipItem[] = [
  { key: 'CONSCIOUS', label: 'Conscious & Able to Speak', emoji: '🗣️' },
  { key: 'TRAPPED', label: 'Trapped Under Debris', emoji: '🏚️', urgent: true },
  { key: 'CANNOT_MOVE', label: 'Cannot Move Legs / Body', emoji: '🚷', urgent: true },
  { key: 'BLEEDING', label: 'Severe Bleeding', emoji: '🩸', urgent: true },
  { key: 'NEED_INSULIN', label: 'Need Insulin Urgently', emoji: '💉', urgent: true },
  { key: 'NEED_OXYGEN', label: 'Difficulty Breathing / Need O2', emoji: '🫁', urgent: true },
  { key: 'SAFE', label: 'I am Safe / Rescued', emoji: '✅' },
];

export const StatusChips: React.FC<StatusChipsProps> = ({
  currentCondition,
  onSelectCondition,
  disabled,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>REPORT YOUR CURRENT STATUS</Text>
      <Text style={styles.subtitle}>
        Broadcasts directly into rescuer radars in real-time
      </Text>

      <View style={styles.grid}>
        {CHIPS.map((chip) => {
          const isSelected = currentCondition === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => onSelectCondition(chip.key)}
              disabled={disabled}
              style={[
                styles.chip,
                isSelected && (chip.urgent ? styles.chipUrgentSelected : styles.chipSelected),
                disabled && styles.chipDisabled,
              ]}
            >
              <Text style={styles.emoji}>{chip.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                  chip.urgent && !isSelected && styles.labelUrgent,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: THEME.radii.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: THEME.colors.radarBlue,
  },
  chipUrgentSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: THEME.colors.sosRed,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  labelSelected: {
    fontWeight: '800',
    color: '#FFF',
  },
  labelUrgent: {
    color: THEME.colors.textDanger,
  },
});

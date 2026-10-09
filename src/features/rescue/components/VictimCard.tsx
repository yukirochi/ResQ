import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiscoveredVictim } from '../../../types';
import { Badge } from '../../../ui/components/Badge';
import { Card } from '../../../ui/components/Card';
import { THEME } from '../../../ui/theme';

interface VictimCardProps {
  victim: DiscoveredVictim;
  onSelect: (victim: DiscoveredVictim) => void;
  onToggleSiren: (victim: DiscoveredVictim) => void;
  onOpenChat: (victim: DiscoveredVictim) => void;
  isSelected?: boolean;
}

export const VictimCard: React.FC<VictimCardProps> = ({
  victim,
  onSelect,
  onToggleSiren,
  onOpenChat,
  isSelected,
}) => {
  const getZoneBadgeVariant = () => {
    switch (victim.zone) {
      case 'IMMEDIATE':
        return 'success';
      case 'NEAR':
        return 'warning';
      case 'FAR':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getTrendBadge = () => {
    switch (victim.trend) {
      case 'WARMER':
        return { label: '🔥 GETTING WARMER', variant: 'success' as const };
      case 'COLDER':
        return { label: '❄️ GETTING COLDER', variant: 'danger' as const };
      default:
        return { label: 'HOLDING STEADY', variant: 'neutral' as const };
    }
  };

  const trend = getTrendBadge();

  return (
    <Card
      variant={victim.zone === 'IMMEDIATE' ? 'glow' : 'default'}
      style={[styles.card, isSelected && styles.selectedBorder]}
    >
      <TouchableOpacity onPress={() => onSelect(victim)} activeOpacity={0.8}>
        {/* Top Header */}
        <View style={styles.topRow}>
          <View>
            <View style={styles.idRow}>
              <Text style={styles.victimId}>VICTIM #{victim.id.slice(-6)}</Text>
              <Badge label={victim.zone} variant={getZoneBadgeVariant()} />
            </View>
            <Text style={styles.distanceValue}>
              {victim.estimatedDistanceMeters.toFixed(1)} <Text style={styles.unit}>meters away</Text>
            </Text>
          </View>

          <View style={styles.trendContainer}>
            <Badge label={trend.label} variant={trend.variant} />
            <Text style={styles.conditionText}>{victim.condition}</Text>
          </View>
        </View>

        {/* AI & Signal Telemetry */}
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>
            Raw RSSI: <Text style={styles.telemetryVal}>{victim.rawRssi} dBm</Text>
          </Text>
          <Text style={styles.telemetryDivider}>•</Text>
          <Text style={styles.telemetryLabel}>
            Cleaned AI: <Text style={[styles.telemetryVal, { color: THEME.colors.immediateGreen }]}>{victim.filteredRssi.toFixed(1)} dBm</Text>
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => onToggleSiren(victim)}
          style={[styles.sirenBtn, victim.isSirenActive && styles.sirenBtnActive]}
        >
          <Text style={[styles.sirenText, victim.isSirenActive && styles.sirenTextActive]}>
            {victim.isSirenActive ? 'SILENCE SIREN' : 'TRIGGER SIREN'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onOpenChat(victim)} style={styles.chatBtn}>
          <Text style={styles.chatText}>P2P CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onSelect(victim)} style={styles.profileBtn}>
          <Text style={styles.profileText}>MEDICAL CARD</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  selectedBorder: {
    borderColor: THEME.colors.radarBlue,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  victimId: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  distanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  trendContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.sosRed,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radii.sm,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  telemetryLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  telemetryVal: {
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  telemetryDivider: {
    color: THEME.colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  sirenBtn: {
    flex: 1.2,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
    alignItems: 'center',
  },
  sirenBtnActive: {
    backgroundColor: THEME.colors.sosRed,
    borderColor: THEME.colors.sosRedDark,
  },
  sirenText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.sosRed,
  },
  sirenTextActive: {
    color: '#FFF',
  },
  chatBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
    alignItems: 'center',
  },
  chatText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.radarBlue,
  },
  profileBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.radarBlue,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
    alignItems: 'center',
  },
  profileText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
});

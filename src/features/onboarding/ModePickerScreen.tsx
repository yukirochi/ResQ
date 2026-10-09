import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PermissionManager } from '../../core/background/permissions';
import { useModeStore } from '../../store/modeStore';
import { AppMode } from '../../types';
import { Card } from '../../ui/components/Card';
import { THEME } from '../../ui/theme';

export const ModePickerScreen: React.FC = () => {
  const { setMode } = useModeStore();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleSelectMode = async (selected: AppMode) => {
    setIsRequesting(true);
    await PermissionManager.requestAllPermissions();
    setIsRequesting(false);
    setMode(selected);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.brandTitle}>ResQ</Text>
          <Text style={styles.brandTagline}>Zero-Internet BLE Emergency Rescue</Text>

          <View style={styles.offlineBadge}>
            <View style={styles.dot} />
            <Text style={styles.offlineText}>100% OFFLINE • NO CELLULAR DATA • NO LOGIN</Text>
          </View>

          <Text style={styles.heroDescription}>
            In earthquakes, collapsed buildings, and remote disaster zones where cell towers are destroyed,
            ResQ connects victims and rescuers directly using Bluetooth Low Energy and On-Device AI.
          </Text>
        </View>

        {/* Mode Selector Cards */}
        <Text style={styles.modeSectionTitle}>CHOOSE YOUR OPERATION MODE</Text>

        {/* Victim Mode */}
        <TouchableOpacity
          onPress={() => handleSelectMode('VICTIM')}
          disabled={isRequesting}
          activeOpacity={0.85}
        >
          <Card variant="danger" style={styles.modeCard}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconCircle}>
                <Text style={styles.modeEmoji}>🆘</Text>
              </View>
              <View style={styles.modeHeaderText}>
                <Text style={styles.modeTitle}>VICTIM MODE</Text>
                <Text style={styles.modeSubtitle}>I need rescue or am in an emergency</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Broadcasts background rotating BLE beacon</Text>
              <Text style={styles.featureItem}>• Shares encrypted medical profile only when SOS active</Text>
              <Text style={styles.featureItem}>• Sounds loud siren when triggered by search team</Text>
              <Text style={styles.featureItem}>• Quick status chips to report injury or trapped state</Text>
            </View>

            <View style={styles.selectBtnDanger}>
              <Text style={styles.selectBtnText}>ACTIVATE VICTIM MODE →</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Rescue Mode */}
        <TouchableOpacity
          onPress={() => handleSelectMode('RESCUE')}
          disabled={isRequesting}
          activeOpacity={0.85}
        >
          <Card variant="glow" style={styles.modeCard}>
            <View style={styles.modeCardHeader}>
              <View style={[styles.modeIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Text style={styles.modeEmoji}>🧭</Text>
              </View>
              <View style={styles.modeHeaderText}>
                <Text style={[styles.modeTitle, { color: THEME.colors.radarBlue }]}>
                  RESCUE SEARCH MODE
                </Text>
                <Text style={styles.modeSubtitle}>I am searching for trapped or hurt victims</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Proximity radar with Immediate, Near, and Far rings</Text>
              <Text style={styles.featureItem}>• AI Neural Network & Kalman filter removes noisy RSSI jumps</Text>
              <Text style={styles.featureItem}>• "Getting Warmer / Colder" real-time trajectory guide</Text>
              <Text style={styles.featureItem}>• Remote trigger to sound victim’s phone siren</Text>
            </View>

            <View style={styles.selectBtnBlue}>
              <Text style={styles.selectBtnText}>ACTIVATE RESCUE MODE →</Text>
            </View>
          </Card>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You can toggle or change modes at any time. ResQ never tracks your location or transmits personal data online.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: THEME.colors.sosRed,
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginVertical: THEME.spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.immediateGreen,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.immediateGreen,
    letterSpacing: 0.5,
  },
  heroDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  modeSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  modeCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  modeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeEmoji: {
    fontSize: 22,
  },
  modeHeaderText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.sosRed,
    letterSpacing: -0.2,
  },
  modeSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  featureList: {
    marginVertical: THEME.spacing.sm,
    gap: 4,
  },
  featureItem: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  selectBtnDanger: {
    backgroundColor: THEME.colors.sosRed,
    paddingVertical: 12,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  selectBtnBlue: {
    backgroundColor: THEME.colors.radarBlue,
    paddingVertical: 12,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  footerNote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: THEME.spacing.md,
  },
});

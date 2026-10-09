import React from 'react';
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BleGattClient } from '../../../core/ble/gattClient';
import { useVictimsStore } from '../../../store/victimsStore';
import { DiscoveredVictim } from '../../../types';
import { Badge } from '../../../ui/components/Badge';
import { Card } from '../../../ui/components/Card';
import { THEME } from '../../../ui/theme';

interface VictimDetailScreenProps {
  victim: DiscoveredVictim;
  onBack: () => void;
  onOpenChat: (victim: DiscoveredVictim) => void;
}

export const VictimDetailScreen: React.FC<VictimDetailScreenProps> = ({
  victim,
  onBack,
  onOpenChat,
}) => {
  const { setVictimSiren } = useVictimsStore();
  const profile = victim.profile;

  const handleToggleSiren = async () => {
    const newState = !victim.isSirenActive;
    setVictimSiren(victim.id, newState);
    await BleGattClient.getInstance().writeSirenCommand(victim.id, newState, true);
  };

  const handleCallEmergencyContact = () => {
    if (profile?.emergencyContact?.phone) {
      Linking.openURL(`tel:${profile.emergencyContact.phone}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Radar</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Victim #{victim.id.slice(-6)}</Text>
        <TouchableOpacity onPress={() => onOpenChat(victim)} style={styles.chatHeaderBtn}>
          <Text style={styles.chatHeaderText}>Chat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Proximity & Status Overview Card */}
        <Card variant="glow" style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.distValue}>
                {victim.estimatedDistanceMeters.toFixed(1)} <Text style={styles.distUnit}>m</Text>
              </Text>
              <Text style={styles.distCaption}>ESTIMATED DISTANCE</Text>
            </View>

            <View style={styles.overviewRight}>
              <Badge label={victim.zone} variant={victim.zone === 'IMMEDIATE' ? 'success' : 'warning'} />
              <Text style={styles.conditionText}>{victim.condition}</Text>
            </View>
          </View>

          {/* Siren Emergency Remote Control */}
          <TouchableOpacity
            onPress={handleToggleSiren}
            style={[styles.sirenBigBtn, victim.isSirenActive && styles.sirenBigBtnActive]}
          >
            <Text style={styles.sirenIcon}>{victim.isSirenActive ? '🔊' : '🔕'}</Text>
            <View>
              <Text style={styles.sirenTitle}>
                {victim.isSirenActive ? 'SILENCE VICTIM PHONE SIREN' : 'TRIGGER VICTIM SIREN'}
              </Text>
              <Text style={styles.sirenSubtitle}>
                {victim.isSirenActive
                  ? 'Alarm is blaring on victim device at 100% volume'
                  : 'Plays high-frequency locating alarm on victim phone'}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Medical Profile Section */}
        <Text style={styles.sectionHeader}>DECRYPTED MEDICAL SUMMARY</Text>
        <Text style={styles.privacyNote}>
          Transmitted over BLE LE Secure Connection • Only shared while victim SOS is active
        </Text>

        {profile ? (
          <View>
            {/* Blood Type & Mobility */}
            <View style={styles.pillRow}>
              {profile.bloodType && (
                <View style={styles.medicalPill}>
                  <Text style={styles.pillLabel}>BLOOD TYPE</Text>
                  <Text style={styles.pillValue}>{profile.bloodType}</Text>
                </View>
              )}

              <View style={styles.medicalPill}>
                <Text style={styles.pillLabel}>MOBILITY</Text>
                <Text
                  style={[
                    styles.pillValue,
                    { color: profile.mobilityImpaired ? THEME.colors.sosRed : THEME.colors.immediateGreen },
                  ]}
                >
                  {profile.mobilityImpaired ? 'Impaired / Trapped' : 'Ambulatory'}
                </Text>
              </View>
            </View>

            {/* Severe Allergies */}
            {profile.allergies && profile.allergies.length > 0 && (
              <Card style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>⚠️ SEVERE ALLERGIES</Text>
                <View style={styles.tagWrap}>
                  {profile.allergies.map((allergy, i) => (
                    <View key={i} style={styles.allergyTag}>
                      <Text style={styles.allergyText}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Medical Conditions */}
            {profile.conditions && profile.conditions.length > 0 && (
              <Card style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>MEDICAL CONDITIONS</Text>
                <View style={styles.tagWrap}>
                  {profile.conditions.map((cond, i) => (
                    <View key={i} style={styles.condTag}>
                      <Text style={styles.condText}>{cond}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Critical Notes */}
            {profile.criticalNotes && (
              <Card style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>CRITICAL RESCUE NOTES</Text>
                <Text style={styles.notesText}>{profile.criticalNotes}</Text>
              </Card>
            )}

            {/* Emergency Contact */}
            {profile.emergencyContact && (
              <Card style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <View>
                    <Text style={styles.contactCaption}>EMERGENCY CONTACT</Text>
                    <Text style={styles.contactName}>{profile.emergencyContact.name}</Text>
                    <Text style={styles.contactPhone}>{profile.emergencyContact.phone}</Text>
                  </View>
                  <TouchableOpacity onPress={handleCallEmergencyContact} style={styles.callBtn}>
                    <Text style={styles.callBtnText}>CALL (CELLULAR)</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          </View>
        ) : (
          <Card style={styles.detailCard}>
            <Text style={styles.loadingText}>Reading GATT PROFILE characteristic from victim...</Text>
          </Card>
        )}

        {/* Start Chat Button */}
        <TouchableOpacity onPress={() => onOpenChat(victim)} style={styles.startChatBtn}>
          <Text style={styles.startChatText}>OPEN OFFLINE STATUS CHAT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.radarBlue,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  chatHeaderBtn: {
    backgroundColor: THEME.colors.surfaceHover,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chatHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.radarBlue,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
  },
  overviewCard: {
    marginBottom: THEME.spacing.md,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  distValue: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -1,
  },
  distUnit: {
    fontSize: 18,
    color: THEME.colors.textMuted,
  },
  distCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  overviewRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.sosRed,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
  },
  sirenBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    borderRadius: THEME.radii.md,
  },
  sirenBigBtnActive: {
    backgroundColor: THEME.colors.sosRed,
    borderColor: THEME.colors.sosRedDark,
  },
  sirenIcon: {
    fontSize: 28,
  },
  sirenTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  sirenSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginTop: THEME.spacing.sm,
  },
  privacyNote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.sm,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  medicalPill: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.md,
    padding: THEME.spacing.md,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  dangerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: THEME.spacing.sm,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.sosRed,
    marginBottom: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.full,
  },
  allergyText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.sosRed,
  },
  detailCard: {
    marginBottom: THEME.spacing.sm,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  condTag: {
    backgroundColor: THEME.colors.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  condText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.textPrimary,
  },
  contactCard: {
    marginBottom: THEME.spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: THEME.colors.immediateGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  startChatBtn: {
    backgroundColor: THEME.colors.radarBlue,
    paddingVertical: 14,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  startChatText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});

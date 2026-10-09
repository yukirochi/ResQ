import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useProfileStore } from '../../../store/profileStore';
import { SharePreferences } from '../../../types';
import { Card } from '../../../ui/components/Card';
import { THEME } from '../../../ui/theme';

interface ProfileEditorScreenProps {
  onBack: () => void;
}

export const ProfileEditorScreen: React.FC<ProfileEditorScreenProps> = ({ onBack }) => {
  const { profile, updateProfile, toggleSharePreference } = useProfileStore();

  const renderShareToggle = (
    label: string,
    key: keyof SharePreferences,
    description: string
  ) => {
    const isShared = profile.sharePreferences[key];
    return (
      <View style={styles.toggleRow}>
        <View style={styles.toggleTextCol}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDesc}>{description}</Text>
        </View>
        <Switch
          value={isShared}
          onValueChange={() => toggleSharePreference(key)}
          trackColor={{ false: THEME.colors.surfaceCard, true: THEME.colors.immediateGreen }}
          thumbColor="#FFF"
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Emergency Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Security Banner */}
        <Card variant="glow" style={styles.securityBanner}>
          <Text style={styles.securityTitle}>🔒 ZERO-CLOUD HARDWARE ENCRYPTION</Text>
          <Text style={styles.securityDesc}>
            This medical card is encrypted with your phone’s hardware Keystore. It is NEVER sent to the cloud.
            Rescuers can only read the specific fields you toggle ON below, and ONLY while your SOS is active.
          </Text>
        </Card>

        {/* Blood Type & Vitals */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldSectionTitle}>BLOOD TYPE</Text>
          <TextInput
            style={styles.textInput}
            value={profile.bloodType}
            onChangeText={(text) => updateProfile({ bloodType: text })}
            placeholder="e.g. O+, A-, B+"
            placeholderTextColor={THEME.colors.textMuted}
          />
          {renderShareToggle('Share Blood Type', 'shareBloodType', 'Allows paramedics to prepare compatible blood units')}
        </Card>

        {/* Severe Allergies */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldSectionTitle}>SEVERE ALLERGIES</Text>
          <TextInput
            style={styles.textInput}
            value={profile.allergies.join(', ')}
            onChangeText={(text) =>
              updateProfile({
                allergies: text.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="e.g. Penicillin, Peanuts, Latex"
            placeholderTextColor={THEME.colors.textMuted}
          />
          {renderShareToggle('Share Allergies', 'shareAllergies', 'Crucial to prevent accidental anaphylaxis')}
        </Card>

        {/* Medical Conditions */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldSectionTitle}>CHRONIC CONDITIONS</Text>
          <TextInput
            style={styles.textInput}
            value={profile.conditions.join(', ')}
            onChangeText={(text) =>
              updateProfile({
                conditions: text.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="e.g. Diabetic Type 1, Asthma, High BP"
            placeholderTextColor={THEME.colors.textMuted}
          />
          {renderShareToggle('Share Conditions', 'shareConditions', 'Informs search medics of insulin or inhaler needs')}
        </Card>

        {/* Mobility Status */}
        <Card style={styles.fieldCard}>
          <View style={styles.mobilityRow}>
            <View>
              <Text style={styles.fieldSectionTitle}>MOBILITY IMPAIRMENT</Text>
              <Text style={styles.mobilitySub}>Requires stretcher or physical extraction</Text>
            </View>
            <Switch
              value={profile.mobilityImpaired}
              onValueChange={(val) => updateProfile({ mobilityImpaired: val })}
              trackColor={{ false: THEME.colors.surfaceCard, true: THEME.colors.sosRed }}
              thumbColor="#FFF"
            />
          </View>
          {renderShareToggle('Share Mobility Status', 'shareMobility', 'Tells rescuer if victim can walk out independently')}
        </Card>

        {/* Emergency Contact */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldSectionTitle}>EMERGENCY CONTACT</Text>
          <TextInput
            style={styles.textInput}
            value={profile.emergencyContact.name}
            onChangeText={(text) =>
              updateProfile({
                emergencyContact: { ...profile.emergencyContact, name: text },
              })
            }
            placeholder="Contact Name (e.g. Spouse / Sibling)"
            placeholderTextColor={THEME.colors.textMuted}
          />
          <TextInput
            style={[styles.textInput, { marginTop: 8 }]}
            value={profile.emergencyContact.phone}
            onChangeText={(text) =>
              updateProfile({
                emergencyContact: { ...profile.emergencyContact, phone: text },
              })
            }
            placeholder="Phone Number"
            keyboardType="phone-pad"
            placeholderTextColor={THEME.colors.textMuted}
          />
          {renderShareToggle('Share Emergency Contact', 'shareEmergencyContact', 'Permits direct cellular call to notify loved ones')}
        </Card>

        {/* Critical Notes */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldSectionTitle}>CRITICAL NOTES & MEDICATIONS</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={profile.criticalNotes}
            onChangeText={(text) => updateProfile({ criticalNotes: text })}
            placeholder="e.g. EpiPen in left jacket pocket; diabetic carrying glucose pills."
            placeholderTextColor={THEME.colors.textMuted}
            multiline
            numberOfLines={3}
          />
          {renderShareToggle('Share Notes', 'shareNotes', 'Instructions for first responders')}
        </Card>
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
  content: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
  },
  securityBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: THEME.spacing.md,
  },
  securityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.radarBlue,
    letterSpacing: 0.5,
  },
  securityDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  fieldCard: {
    marginBottom: THEME.spacing.sm,
  },
  fieldSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceHover,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  mobilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobilitySub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
});

import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BleSimulatorEngine } from '../../core/ble/simulation/bleSimulator';
import { useModeStore } from '../../store/modeStore';
import { VictimStatusCondition } from '../../types';
import { THEME } from '../theme';

interface SimulatorHudProps {
  visible: boolean;
  onClose: () => void;
}

const CONDITIONS: VictimStatusCondition[] = [
  'CONSCIOUS',
  'TRAPPED',
  'BLEEDING',
  'CANNOT_MOVE',
  'NEED_INSULIN',
  'NEED_OXYGEN',
  'UNRESPONSIVE',
];

export const SimulatorHud: React.FC<SimulatorHudProps> = ({ visible, onClose }) => {
  const { isSimulating, setSimulating } = useModeStore();
  const simulator = BleSimulatorEngine.getInstance();
  const [victims, setVictims] = useState(() => simulator.getAllVirtualVictims());

  const refresh = () => {
    setVictims([...simulator.getAllVirtualVictims()]);
  };

  const handleCloser = (id: string) => {
    simulator.moveVictimCloser(id, 0.8);
    refresh();
  };

  const handleFarther = (id: string) => {
    simulator.moveVictimFarther(id, 0.8);
    refresh();
  };

  const handleToggleWall = (id: string) => {
    simulator.toggleWall(id);
    refresh();
  };

  const handleToggleSiren = (id: string, currentState: boolean) => {
    simulator.setSirenState(id, !currentState);
    refresh();
  };

  const handleChangeCondition = (id: string, cond: VictimStatusCondition) => {
    simulator.setVictimCondition(id, cond);
    refresh();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>BLE RF Environment Simulator</Text>
              <Text style={styles.subtitle}>Simulates real RF multipath, noise, & distances</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Hardware Simulation Engine</Text>
            <TouchableOpacity
              onPress={() => setSimulating(!isSimulating)}
              style={[styles.toggleBtn, isSimulating && styles.toggleBtnActive]}
            >
              <Text style={styles.toggleBtnText}>{isSimulating ? 'SIMULATOR ACTIVE' : 'REAL HARDWARE'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.sectionTitle}>VIRTUAL BLE VICTIMS</Text>

            {victims.map((v) => (
              <View key={v.id} style={styles.victimCard}>
                <View style={styles.victimTop}>
                  <View>
                    <Text style={styles.victimName}>{v.name}</Text>
                    <Text style={styles.victimId}>ID: {v.id.slice(0, 8)}... | Distance: {v.distanceMeters.toFixed(1)}m</Text>
                  </View>
                  <View style={[styles.conditionPill, v.condition === 'TRAPPED' && styles.conditionDanger]}>
                    <Text style={styles.conditionText}>{v.condition}</Text>
                  </View>
                </View>

                {/* Distance simulation controls */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Rescuer Position:</Text>
                  <TouchableOpacity onPress={() => handleCloser(v.id)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>+ Walk Closer (-0.8m)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleFarther(v.id)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>- Walk Away (+0.8m)</Text>
                  </TouchableOpacity>
                </View>

                {/* Obstacle and Siren */}
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    onPress={() => handleToggleWall(v.id)}
                    style={[styles.chipBtn, v.wallObstacle && styles.chipBtnActive]}
                  >
                    <Text style={styles.chipBtnText}>
                      {v.wallObstacle ? 'Concrete Wall (-10dB) ON' : 'Direct Line of Sight'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleToggleSiren(v.id, v.isSirenActive)}
                    style={[styles.chipBtn, v.isSirenActive && styles.sirenActiveBtn]}
                  >
                    <Text style={[styles.chipBtnText, v.isSirenActive && styles.sirenActiveText]}>
                      {v.isSirenActive ? 'Siren BEEPING' : 'Siren Silenced'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Condition selector chips */}
                <Text style={styles.miniLabel}>Update Victim Condition:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.condScroll}>
                  {CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => handleChangeCondition(v.id, c)}
                      style={[styles.smallChip, v.condition === c && styles.smallChipActive]}
                    >
                      <Text style={[styles.smallChipText, v.condition === c && styles.smallChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radii.lg,
    borderTopRightRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    maxHeight: '85%',
    padding: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    backgroundColor: THEME.colors.radarBlue,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    marginBottom: THEME.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.sm,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: THEME.colors.immediateGreen,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.immediateGreen,
  },
  body: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginVertical: 8,
  },
  victimCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radii.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  victimTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  victimName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  victimId: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  conditionPill: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radii.full,
  },
  conditionDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  actionBtn: {
    backgroundColor: THEME.colors.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.radarBlue,
  },
  chipBtn: {
    backgroundColor: THEME.colors.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flex: 1,
    alignItems: 'center',
  },
  chipBtnActive: {
    borderColor: THEME.colors.nearAmber,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  sirenActiveBtn: {
    borderColor: THEME.colors.sosRed,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  sirenActiveText: {
    color: THEME.colors.sosRed,
    fontWeight: '700',
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  miniLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  condScroll: {
    flexDirection: 'row',
  },
  smallChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
    backgroundColor: THEME.colors.surfaceHover,
    marginRight: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  smallChipActive: {
    borderColor: THEME.colors.radarBlue,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  smallChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  smallChipTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
});

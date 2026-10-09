import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { SirenManager } from '../../../core/audio/siren';
import { BleAdvertiserManager } from '../../../core/ble/advertiser';
import { BleGattServer } from '../../../core/ble/gattServer';
import { useModeStore } from '../../../store/modeStore';
import { useProfileStore } from '../../../store/profileStore';
import { VictimStatusCondition } from '../../../types';
import { Card } from '../../../ui/components/Card';
import { Header } from '../../../ui/components/Header';
import { SimulatorHud } from '../../../ui/components/SimulatorHud';
import { THEME } from '../../../ui/theme';
import { SosButton } from '../components/SosButton';
import { StatusChips } from '../components/StatusChips';

interface SosHomeScreenProps {
  onOpenProfile: () => void;
  onOpenChat: () => void;
  onOpenSurvival?: () => void;
}

export const SosHomeScreen: React.FC<SosHomeScreenProps> = ({ onOpenProfile, onOpenChat, onOpenSurvival }) => {
  const { isSosActive, setSosActive } = useModeStore();
  const { getSanitizedPublicProfile } = useProfileStore();
  const [currentCondition, setCurrentCondition] = useState<VictimStatusCondition>('CONSCIOUS');
  const [isSirenSounding, setIsSirenSounding] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);

  // === Shake-to-SOS Detection ===
  const [shakeCountdown, setShakeCountdown] = useState(0); // 0 = not counting
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimestampRef = useRef(0);
  const shakeHitsRef = useRef(0);

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100); // 10Hz
    const sub = accelerometer.subscribe(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      // Detect sudden strong movement (threshold ~2.5g = 25 m/s²)
      if (magnitude > 25) {
        if (now - shakeTimestampRef.current > 1200) shakeHitsRef.current = 0;
        shakeHitsRef.current++;
        shakeTimestampRef.current = now;
        // After 5 shake hits start countdown
        if (shakeHitsRef.current >= 5 && shakeCountdown === 0) {
          Vibration.vibrate([0, 300, 150, 300, 150, 300]);
          setShakeCountdown(10);
          shakeHitsRef.current = 0;
        }
      }
    });
    return () => sub.unsubscribe();
  }, [shakeCountdown]);

  useEffect(() => {
    if (shakeCountdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setShakeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // Auto-trigger SOS
          setSosActive(true);
          BleAdvertiserManager.getInstance().startAdvertising(currentCondition);
          BleGattServer.getInstance().startServer(true, getSanitizedPublicProfile());
          Vibration.vibrate(1000);
          Alert.alert('🚨 Auto SOS Activated', 'Violent motion detected. Your emergency beacon is now broadcasting!', [{ text: 'OK' }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [shakeCountdown]);

  const cancelShakeSos = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShakeCountdown(0);
    shakeHitsRef.current = 0;
  };

  const handleToggleSos = () => {
    const nextState = !isSosActive;
    setSosActive(nextState);

    if (nextState) {
      BleAdvertiserManager.getInstance().startAdvertising(currentCondition);
      BleGattServer.getInstance().startServer(true, getSanitizedPublicProfile());
    } else {
      BleAdvertiserManager.getInstance().stopAdvertising();
      BleGattServer.getInstance().stopServer();
      SirenManager.getInstance().silenceSiren();
      setIsSirenSounding(false);
    }
  };

  const handleConditionChange = (condition: VictimStatusCondition) => {
    setCurrentCondition(condition);
    BleAdvertiserManager.getInstance().updateCondition(condition);
    BleGattServer.getInstance().updateStatus(condition);
  };

  const handleToggleSirenAudio = () => {
    if (isSirenSounding) {
      SirenManager.getInstance().silenceSiren();
      setIsSirenSounding(false);
    } else {
      SirenManager.getInstance().triggerSiren();
      setIsSirenSounding(true);
    }
  };

  const handleCall911 = () => {
    Linking.openURL('tel:911');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Emergency Beacon" onOpenSimulator={() => setHudVisible(true)} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shake SOS Countdown Banner */}
        {shakeCountdown > 0 && (
          <View style={styles.shakeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shakeBannerTitle}>⚠️ SHAKE DETECTED — AUTO SOS IN {shakeCountdown}s</Text>
              <Text style={styles.shakeBannerSub}>Violent motion detected. SOS will auto-broadcast unless cancelled.</Text>
            </View>
            <TouchableOpacity onPress={cancelShakeSos} style={styles.shakeCancelBtn}>
              <Text style={styles.shakeCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Beacon Banner */}
        <View style={[styles.beaconBanner, isSosActive ? styles.bannerActive : styles.bannerIdle]}>
          <View style={[styles.dot, isSosActive ? styles.dotActive : styles.dotIdle]} />
          <Text style={[styles.bannerText, isSosActive && styles.bannerTextActive]}>
            {isSosActive
              ? 'BEACON BROADCASTING: Rescuers nearby can detect you'
              : 'BEACON STANDBY: Press SOS button below to broadcast'}
          </Text>
        </View>

        {/* Tactile SOS Button */}
        <SosButton isActive={isSosActive} onToggle={handleToggleSos} />

        {/* Instant Cellular Emergency Call */}
        <TouchableOpacity onPress={handleCall911} style={styles.call911Btn}>
          <Text style={styles.call911Icon}>📞</Text>
          <View>
            <Text style={styles.call911Title}>CALL 911 (EMERGENCY DISPATCH)</Text>
            <Text style={styles.call911Sub}>Direct cellular dial • No internet or data needed</Text>
          </View>
        </TouchableOpacity>

        {/* Real-time Status Condition Chips */}
        <StatusChips
          currentCondition={currentCondition}
          onSelectCondition={handleConditionChange}
          disabled={!isSosActive}
        />

        {/* Local Siren Controls */}
        <Card style={styles.sirenCard}>
          <View style={styles.sirenRow}>
            <View>
              <Text style={styles.sirenCardTitle}>LOCAL PHONE SIREN</Text>
              <Text style={styles.sirenCardSub}>
                {isSirenSounding ? 'Alarm sounding at maximum volume' : 'High-pitch audible alarm for search teams'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleSirenAudio}
              style={[styles.sirenToggleBtn, isSirenSounding && styles.sirenToggleBtnActive]}
            >
              <Text style={[styles.sirenToggleText, isSirenSounding && styles.sirenToggleTextActive]}>
                {isSirenSounding ? 'SILENCE' : 'TEST SIREN'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Quick Navigation Cards */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onOpenProfile} style={styles.navCard}>
            <Text style={styles.navCardIcon}>🛡️</Text>
            <Text style={styles.navCardTitle}>Medical Profile</Text>
            <Text style={styles.navCardSub}>Encrypted on phone</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onOpenChat} style={styles.navCard}>
            <Text style={styles.navCardIcon}>💬</Text>
            <Text style={styles.navCardTitle}>Offline Chat</Text>
            <Text style={styles.navCardSub}>P2P BLE link</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onOpenSurvival} style={styles.navCard}>
            <Text style={styles.navCardIcon}>⚡</Text>
            <Text style={styles.navCardTitle}>Survival & AI</Text>
            <Text style={styles.navCardSub}>Offline Guide</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SimulatorHud visible={hudVisible} onClose={() => setHudVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
  },
  beaconBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: THEME.spacing.md,
    borderRadius: THEME.radii.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
  },
  bannerIdle: {
    backgroundColor: THEME.colors.surfaceCard,
    borderColor: THEME.colors.border,
  },
  bannerActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: THEME.colors.sosRed,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotIdle: {
    backgroundColor: THEME.colors.textMuted,
  },
  dotActive: {
    backgroundColor: THEME.colors.sosRed,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    flex: 1,
  },
  bannerTextActive: {
    color: THEME.colors.textPrimary,
  },
  call911Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: THEME.colors.sosRed,
    padding: THEME.spacing.md,
    borderRadius: THEME.radii.md,
    marginVertical: THEME.spacing.sm,
  },
  call911Icon: {
    fontSize: 22,
  },
  call911Title: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  call911Sub: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 2,
  },
  sirenCard: {
    marginVertical: THEME.spacing.sm,
  },
  sirenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sirenCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  sirenCardSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sirenToggleBtn: {
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
  },
  sirenToggleBtnActive: {
    backgroundColor: THEME.colors.sosRed,
    borderColor: THEME.colors.sosRedDark,
  },
  sirenToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  sirenToggleTextActive: {
    color: '#FFF',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: THEME.spacing.md,
  },
  navCard: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.md,
    padding: THEME.spacing.md,
    alignItems: 'center',
  },
  navCardIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  navCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  navCardSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  shakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: THEME.spacing.md,
    borderRadius: THEME.radii.md,
    marginBottom: THEME.spacing.sm,
  },
  shakeBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  shakeBannerSub: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 2,
  },
  shakeCancelBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
  },
  shakeCancelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },
});

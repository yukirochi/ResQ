import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BleGattClient } from '../../../core/ble/gattClient';
import { BleScannerManager } from '../../../core/ble/scanner';
import { useVictimsStore } from '../../../store/victimsStore';
import { DiscoveredVictim } from '../../../types';
import { Header } from '../../../ui/components/Header';
import { SimulatorHud } from '../../../ui/components/SimulatorHud';
import { THEME } from '../../../ui/theme';
import { ProximityRing } from '../components/ProximityRing';
import { VictimCard } from '../components/VictimCard';

interface RadarScreenProps {
  onInspectVictim: (victim: DiscoveredVictim) => void;
  onOpenChat: (victim: DiscoveredVictim) => void;
}

export const RadarScreen: React.FC<RadarScreenProps> = ({ onInspectVictim, onOpenChat }) => {
  const { victims, upsertVictim, selectedVictimId, selectVictim, setVictimSiren, getRankedVictims } =
    useVictimsStore();
  const [hudVisible, setHudVisible] = useState(false);

  useEffect(() => {
    // Start listening to BLE scan stream
    const unsubscribe = BleScannerManager.getInstance().addListener((victim) => {
      upsertVictim(victim);
    });

    BleScannerManager.getInstance().startScan();

    return () => {
      unsubscribe();
    };
  }, [upsertVictim]);

  const ranked = getRankedVictims();
  const nearest = ranked.length > 0 ? ranked[0] : null;

  const handleToggleSiren = async (victim: DiscoveredVictim) => {
    const newState = !victim.isSirenActive;
    setVictimSiren(victim.id, newState);
    await BleGattClient.getInstance().writeSirenCommand(victim.id, newState, true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Search Radar" onOpenSimulator={() => setHudVisible(true)} />

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Visual Radar Rings */}
            <ProximityRing
              victims={ranked}
              onSelectVictim={(v) => {
                selectVictim(v.id);
                onInspectVictim(v);
              }}
              selectedVictimId={selectedVictimId}
            />

            {/* Nearest Target Spotlight Banner */}
            {nearest ? (
              <View style={styles.spotlightBanner}>
                <View style={styles.spotlightIconContainer}>
                  <Text style={styles.spotlightIcon}>🎯</Text>
                </View>
                <View style={styles.spotlightInfo}>
                  <Text style={styles.spotlightTitle}>NEAREST VICTIM DETECTED</Text>
                  <Text style={styles.spotlightDistance}>
                    {nearest.estimatedDistanceMeters.toFixed(1)}m away •{' '}
                    <Text style={{ color: nearest.trend === 'WARMER' ? THEME.colors.immediateGreen : THEME.colors.sosRed }}>
                      {nearest.trend === 'WARMER' ? 'Getting Warmer' : nearest.trend === 'COLDER' ? 'Getting Colder' : 'Stable'}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Scanning BLE 2.4GHz for ResQ Emergency Beacons...</Text>
              </View>
            )}

            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>
                DISCOVERED VICTIMS ({ranked.length})
              </Text>
              <Text style={styles.listSortCaption}>Sorted by Proximity</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <VictimCard
            victim={item}
            isSelected={item.id === selectedVictimId}
            onSelect={(v) => {
              selectVictim(v.id);
              onInspectVictim(v);
            }}
            onToggleSiren={handleToggleSiren}
            onOpenChat={onOpenChat}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <SimulatorHud visible={hudVisible} onClose={() => setHudVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    paddingBottom: THEME.spacing.xxl,
  },
  spotlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    padding: THEME.spacing.md,
    borderRadius: THEME.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  spotlightIconContainer: {
    marginRight: THEME.spacing.md,
  },
  spotlightIcon: {
    fontSize: 24,
  },
  spotlightInfo: {
    flex: 1,
  },
  spotlightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.radarBlue,
    letterSpacing: 0.5,
  },
  spotlightDistance: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  listSortCaption: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
});

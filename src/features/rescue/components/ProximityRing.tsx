import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { DiscoveredVictim, ProximityZone } from '../../../types';
import { THEME } from '../../../ui/theme';

interface ProximityRingProps {
  victims: DiscoveredVictim[];
  onSelectVictim: (victim: DiscoveredVictim) => void;
  selectedVictimId: string | null;
}

const { width } = Dimensions.get('window');
const RADAR_SIZE = Math.min(width - 48, 320);
const CENTER = RADAR_SIZE / 2;

export const ProximityRing: React.FC<ProximityRingProps> = ({
  victims,
  onSelectVictim,
  selectedVictimId,
}) => {
  const getRadiusForDistance = (dist: number): number => {
    // Map 0 to 18 meters into radar pixels (0 to CENTER - 16)
    const maxDist = 18.0;
    const clamped = Math.max(0.5, Math.min(maxDist, dist));
    const normalized = clamped / maxDist;
    return (CENTER - 16) * normalized;
  };

  const getZoneLabelColor = (zone: ProximityZone): string => {
    switch (zone) {
      case 'IMMEDIATE':
        return THEME.colors.immediateGreen;
      case 'NEAR':
        return THEME.colors.nearAmber;
      case 'FAR':
        return THEME.colors.farRed;
      default:
        return THEME.colors.lostSlate;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.radarCircle, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
        {/* Far Zone Ring (15m) */}
        <View
          style={[
            styles.ring,
            {
              width: RADAR_SIZE - 20,
              height: RADAR_SIZE - 20,
              borderColor: 'rgba(239, 68, 68, 0.25)',
            },
          ]}
        />

        {/* Near Zone Ring (5m) */}
        <View
          style={[
            styles.ring,
            {
              width: (RADAR_SIZE - 20) * 0.55,
              height: (RADAR_SIZE - 20) * 0.55,
              borderColor: 'rgba(245, 158, 11, 0.35)',
            },
          ]}
        />

        {/* Immediate Zone Ring (<2m) */}
        <View
          style={[
            styles.ring,
            {
              width: (RADAR_SIZE - 20) * 0.26,
              height: (RADAR_SIZE - 20) * 0.26,
              borderColor: 'rgba(16, 185, 129, 0.5)',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
            },
          ]}
        />

        {/* Crosshair Axes */}
        <View style={styles.axisHorizontal} />
        <View style={styles.axisVertical} />

        {/* Center Rescuer Blip */}
        <View style={styles.centerRescuer}>
          <View style={styles.centerPulse} />
          <Text style={styles.centerLabel}>YOU</Text>
        </View>

        {/* Discovered Victim Blips */}
        {victims.map((v, index) => {
          const radius = getRadiusForDistance(v.estimatedDistanceMeters);
          // Distribute angles deterministically based on hash of victim ID
          const angle = ((parseInt(v.id.slice(-4), 16) || index * 60) % 360) * (Math.PI / 180);
          const x = CENTER + radius * Math.cos(angle) - 14;
          const y = CENTER + radius * Math.sin(angle) - 14;
          const isSelected = v.id === selectedVictimId;

          return (
            <View
              key={v.id}
              style={[
                styles.blip,
                {
                  left: x,
                  top: y,
                  borderColor: getZoneLabelColor(v.zone),
                  backgroundColor: isSelected ? getZoneLabelColor(v.zone) : THEME.colors.surfaceCard,
                },
                v.isSirenActive && styles.blipSirenActive,
              ]}
            >
              <Text style={[styles.blipText, isSelected && styles.blipTextSelected]}>
                {v.id.slice(-2)}
              </Text>
            </View>
          );
        })}

        {/* Zone Markers */}
        <Text style={[styles.zoneLabel, { top: 8 }]}>FAR (15m)</Text>
        <Text style={[styles.zoneLabel, { top: CENTER - 65 }]}>NEAR (5m)</Text>
        <Text style={[styles.zoneLabel, { top: CENTER - 28, color: THEME.colors.immediateGreen }]}>
          &lt; 2m
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.md,
  },
  radarCircle: {
    backgroundColor: '#070B12',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  axisHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  axisVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  centerRescuer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.radarBlue,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  centerPulse: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  centerLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFF',
  },
  blip: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
  },
  blipSirenActive: {
    borderWidth: 3,
    borderColor: THEME.colors.sosRed,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  blipText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  blipTextSelected: {
    color: '#000',
  },
  zoneLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
});

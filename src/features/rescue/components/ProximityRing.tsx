import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DiscoveredVictim, ProximityZone } from '../../../types';
import { THEME } from '../../../ui/theme';

interface ProximityRingProps {
  victims: DiscoveredVictim[];
  onSelectVictim: (victim: DiscoveredVictim) => void;
  selectedVictimId: string | null;
}

const { width } = Dimensions.get('window');
const RADAR_SIZE = Math.min(width - 40, 300);
const CENTER = RADAR_SIZE / 2;

const SweepArm = () => {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [rotation]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }]}
    >
      <View style={styles.sweepArm} />
    </Animated.View>
  );
};

const PulseRing = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(600),
      ])
    ).start();
  }, [scale, opacity]);
  return <Animated.View style={[styles.pulse, { transform: [{ scale }], opacity }]} />;
};

const getZoneColor = (zone: ProximityZone) => {
  switch (zone) {
    case 'IMMEDIATE': return '#10B981';
    case 'NEAR': return '#F59E0B';
    case 'FAR': return '#E53935';
    default: return '#9EABB8';
  }
};

export const ProximityRing: React.FC<ProximityRingProps> = ({ victims, onSelectVictim, selectedVictimId }) => {
  const getRadius = (dist: number) => (Math.max(0.5, Math.min(20, dist)) / 20) * (CENTER - 28);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.radar, { width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2 }]}>
        {/* Rings */}
        {[0.85, 0.57, 0.3].map((s, i) => (
          <View key={i} style={[
            styles.ring,
            { width: RADAR_SIZE * s, height: RADAR_SIZE * s, borderRadius: RADAR_SIZE * s / 2 },
            i === 0 && { borderColor: 'rgba(229,57,53,0.2)' },
            i === 1 && { borderColor: 'rgba(245,158,11,0.25)' },
            i === 2 && { borderColor: 'rgba(16,185,129,0.3)' },
          ]} />
        ))}

        {/* Axes */}
        <View style={styles.axisH} />
        <View style={styles.axisV} />

        {/* Sweep arm */}
        <SweepArm />

        {/* YOU */}
        <View style={styles.youWrap}>
          <PulseRing />
          <View style={styles.youDot}>
            <Text style={styles.youText}>YOU</Text>
          </View>
        </View>

        {/* Victims */}
        {victims.map((v, i) => {
          const r = getRadius(v.estimatedDistanceMeters);
          const a = ((parseInt(v.id.slice(-4), 16) || i * 73) % 360) * (Math.PI / 180);
          const color = getZoneColor(v.zone);
          const sel = v.id === selectedVictimId;
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => onSelectVictim(v)}
              style={[styles.blip, {
                left: CENTER + r * Math.cos(a) - 16,
                top: CENTER + r * Math.sin(a) - 16,
                backgroundColor: sel ? color : `${color}20`,
                borderColor: color,
              }]}
            >
              <Text style={[styles.blipText, { color: sel ? '#fff' : color }]}>
                {v.id.slice(-2).toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}

        {victims.length === 0 && (
          <Text style={styles.scanning}>SCANNING</Text>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[['#10B981', '<3m IMMEDIATE'], ['#F59E0B', '3–8m NEAR'], ['#E53935', '>8m FAR']].map(([c, l]) => (
          <View key={l} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: 12 },
  radar: {
    backgroundColor: '#0A0F1A',
    borderWidth: 1.5,
    borderColor: 'rgba(229,57,53,0.3)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#E53935',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  ring: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed' },
  axisH: { position: 'absolute', width: '100%', height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' },
  axisV: { position: 'absolute', height: '100%', width: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' },
  sweepArm: {
    position: 'absolute',
    top: CENTER,
    left: CENTER,
    width: CENTER - 6,
    height: 2,
    backgroundColor: THEME.colors.primaryRed,
    shadowColor: THEME.colors.primaryRed,
    shadowOpacity: 1,
    shadowRadius: 6,
    opacity: 0.85,
  },
  youWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  pulse: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    backgroundColor: THEME.colors.primaryRed,
  },
  youDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME.colors.primaryRed,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    elevation: 6, shadowColor: THEME.colors.primaryRed, shadowOpacity: 0.8, shadowRadius: 6,
  },
  youText: { fontSize: 7, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  blip: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 15,
  },
  blipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  scanning: {
    position: 'absolute', fontSize: 9, fontWeight: '800',
    color: 'rgba(229,57,53,0.35)', letterSpacing: 3, top: CENTER + 22,
  },
  legend: { flexDirection: 'row', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 9, color: THEME.colors.textSub, fontWeight: '700', letterSpacing: 0.5 },
});

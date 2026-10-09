/**
 * ResQ: Offline Peer-to-Peer BLE Emergency Rescue System
 * Core TypeScript Type Definitions
 */

export type AppMode = 'NONE' | 'VICTIM' | 'RESCUE';

export type VictimStatusCondition =
  | 'CONSCIOUS'
  | 'UNRESPONSIVE'
  | 'CANNOT_MOVE'
  | 'BLEEDING'
  | 'TRAPPED'
  | 'NEED_INSULIN'
  | 'NEED_OXYGEN'
  | 'SAFE';

export type ProximityZone = 'IMMEDIATE' | 'NEAR' | 'FAR' | 'UNKNOWN';

export type ProximityTrend = 'WARMER' | 'COLDER' | 'STABLE' | 'UNKNOWN';

export interface RssiSample {
  rssi: number;
  timestamp: number;
}

export interface SignalFilterResult {
  rawRssi: number;
  filteredRssi: number;
  variance: number;
  estimatedDistanceMeters: number;
  zone: ProximityZone;
  trend: ProximityTrend;
  confidence: number;
  algorithm: 'TFLITE_1DCNN' | 'KALMAN_ADAPTIVE' | 'WEIGHTED_MOVING_AVG';
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface SharePreferences {
  shareBloodType: boolean;
  shareAllergies: boolean;
  shareConditions: boolean;
  shareMobility: boolean;
  shareEmergencyContact: boolean;
  shareNotes: boolean;
}

export interface VictimProfile {
  id: string;
  fullName: string; // Stored locally only, never transmitted over BLE
  bloodType: string;
  allergies: string[];
  conditions: string[];
  mobilityImpaired: boolean;
  emergencyContact: EmergencyContact;
  criticalNotes: string;
  sharePreferences: SharePreferences;
  updatedAt: number;
}

export interface PublicVictimProfile {
  ephemeralId: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  mobilityImpaired?: boolean;
  emergencyContact?: EmergencyContact;
  criticalNotes?: string;
  timestamp: number;
}

export interface DiscoveredVictim {
  id: string; // Ephemeral 8-byte ID (hex string)
  rawRssi: number;
  filteredRssi: number;
  estimatedDistanceMeters: number;
  zone: ProximityZone;
  trend: ProximityTrend;
  lastSeen: number;
  statusByte: number;
  condition: VictimStatusCondition;
  isSirenActive: boolean;
  isConnected: boolean;
  profile?: PublicVictimProfile;
  rssiHistory: RssiSample[];
}

export type MessageSender = 'RESCUER' | 'VICTIM';
export type MessageDeliveryStatus = 'QUEUED' | 'TRANSMITTING' | 'DELIVERED' | 'FAILED';

export interface ChatMessage {
  id: string;
  victimId: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
  status: MessageDeliveryStatus;
}

export type SirenCommand = 0x00 | 0x01; // 0 = Silence, 1 = Trigger Siren

export interface BlePacketHeader {
  version: number;
  type: number;
  sequence: number;
  totalPackets: number;
  payloadLength: number;
}

export interface BleSimulatorConfig {
  enabled: boolean;
  virtualVictimCount: number;
  driftRate: number; // meters/sec
  rfNoiseStdDev: number; // dB
  fadingModel: 'RAYLEIGH' | 'RICIAN' | 'GAUSSIAN';
  simulatedObstacleWall: boolean;
}

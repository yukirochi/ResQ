/**
 * ResQ Hybrid BLE Hardware Simulator Engine
 * Generates realistic RF environments, multipath Rayleigh fading, and virtual BLE victims.
 * Enables zero-hardware testing of Radar, Kalman/AI Signal Filtering, Siren, and Chat.
 */

import { DiscoveredVictim, PublicVictimProfile, VictimStatusCondition } from '../../../types';
import { SignalCleanerManager } from '../../ml/signalCleaner';

export interface VirtualVictimState {
  id: string;
  name: string;
  distanceMeters: number; // Simulated true ground-truth distance
  condition: VictimStatusCondition;
  isSirenActive: boolean;
  wallObstacle: boolean; // Simulates rubble or concrete wall (-10 to -15 dB)
  profile: PublicVictimProfile;
  connected: boolean;
}

export type BleScanCallback = (victim: DiscoveredVictim) => void;

export class BleSimulatorEngine {
  private static instance: BleSimulatorEngine;
  private isRunning: boolean = false;
  private timer: any = null;
  private scanCallbacks: Set<BleScanCallback> = new Set();

  // Simulated ground-truth virtual victims
  private virtualVictims: Map<string, VirtualVictimState> = new Map();

  private constructor() {
    this.seedVirtualVictims();
  }

  public static getInstance(): BleSimulatorEngine {
    if (!BleSimulatorEngine.instance) {
      BleSimulatorEngine.instance = new BleSimulatorEngine();
    }
    return BleSimulatorEngine.instance;
  }

  private seedVirtualVictims(): void {
    const victims: VirtualVictimState[] = [
      {
        id: 'A1B2C3D4E5F60001',
        name: 'Sarah M. (Trapped under rubble)',
        distanceMeters: 3.2,
        condition: 'TRAPPED',
        isSirenActive: false,
        wallObstacle: true,
        connected: false,
        profile: {
          ephemeralId: 'A1B2C3D4E5F60001',
          bloodType: 'O+',
          allergies: ['Penicillin', 'Peanuts'],
          conditions: ['Asthmatic', 'Diabetic (Type 1)'],
          mobilityImpaired: true,
          emergencyContact: {
            name: 'David M. (Brother)',
            relationship: 'Brother',
            phone: '+1-555-0192',
          },
          criticalNotes: 'Requires insulin if found. Carrying emergency inhaler in front pocket.',
          timestamp: Date.now() - 360000,
        },
      },
      {
        id: '8877665544330002',
        name: 'Alex R. (Conscious, nearby)',
        distanceMeters: 1.5,
        condition: 'CONSCIOUS',
        isSirenActive: false,
        wallObstacle: false,
        connected: false,
        profile: {
          ephemeralId: '8877665544330002',
          bloodType: 'A+',
          allergies: ['Latex'],
          conditions: ['High Blood Pressure'],
          mobilityImpaired: false,
          emergencyContact: {
            name: 'Elena R. (Spouse)',
            relationship: 'Spouse',
            phone: '+1-555-0144',
          },
          criticalNotes: 'Mild laceration on left arm.',
          timestamp: Date.now() - 120000,
        },
      },
      {
        id: '9900112233440003',
        name: 'Unknown Victim (Far zone)',
        distanceMeters: 11.8,
        condition: 'CANNOT_MOVE',
        isSirenActive: false,
        wallObstacle: false,
        connected: false,
        profile: {
          ephemeralId: '9900112233440003',
          bloodType: 'B-',
          allergies: [],
          conditions: ['Spinal Caution'],
          mobilityImpaired: true,
          emergencyContact: {
            name: 'Emergency Dispatch',
            relationship: 'EMS',
            phone: '911',
          },
          criticalNotes: 'Do not move without neck brace if possible.',
          timestamp: Date.now() - 50000,
        },
      },
    ];

    for (const v of victims) {
      this.virtualVictims.set(v.id, v);
    }
  }

  public startScanning(callback: BleScanCallback): void {
    this.scanCallbacks.add(callback);
    if (!this.isRunning) {
      this.isRunning = true;
      this.scheduleLoop();
    }
  }

  public stopScanning(callback?: BleScanCallback): void {
    if (callback) {
      this.scanCallbacks.delete(callback);
    } else {
      this.scanCallbacks.clear();
    }

    if (this.scanCallbacks.size === 0) {
      this.isRunning = false;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }

  private scheduleLoop(): void {
    if (this.timer) clearInterval(this.timer);

    // Standard BLE Advertising rate: emit packets every 350ms
    this.timer = setInterval(() => {
      if (!this.isRunning) return;

      this.virtualVictims.forEach((victim) => {
        // Synthesize realistic noisy RSSI
        const rawRssi = this.generateNoisyRssi(victim.distanceMeters, victim.wallObstacle);

        // Process through Neural / Kalman Signal Cleaner
        const pipeline = SignalCleanerManager.getInstance().getOrCreatePipeline(victim.id);
        const filtered = pipeline.processSample(rawRssi);

        const discovered: DiscoveredVictim = {
          id: victim.id,
          rawRssi,
          filteredRssi: filtered.filteredRssi,
          estimatedDistanceMeters: filtered.estimatedDistanceMeters,
          zone: filtered.zone,
          trend: filtered.trend,
          lastSeen: Date.now(),
          statusByte: 0x01,
          condition: victim.condition,
          isSirenActive: victim.isSirenActive,
          isConnected: victim.connected,
          profile: victim.profile,
          rssiHistory: pipeline.getBuffer().getSamples(),
        };

        this.scanCallbacks.forEach((cb) => cb(discovered));
      });
    }, 400);
  }

  /**
   * Log-distance path loss + Rayleigh multipath fading + Gaussian shadow noise
   */
  private generateNoisyRssi(distanceMeters: number, hasWall: boolean): number {
    const txPower1m = -59.0;
    const n = 2.8;

    // Base path loss
    const pathLoss = 10 * n * Math.log10(Math.max(0.3, distanceMeters));
    let baseRssi = txPower1m - pathLoss;

    // Wall / rubble attenuation
    if (hasWall) {
      baseRssi -= 9.5;
    }

    // Gaussian noise (mean 0, std dev 3.2 dB)
    const u1 = Math.random() || 0.001;
    const u2 = Math.random() || 0.001;
    const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * 3.2;

    // Small multipath fading ripple
    const multipath = (Math.random() - 0.5) * 2.5;

    return Math.round(baseRssi + gaussian + multipath);
  }

  // --- Interactive Simulation Controls for Testing ---

  public moveVictimCloser(victimId: string, deltaMeters: number = 0.8): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.distanceMeters = Math.max(0.4, Math.round((v.distanceMeters - deltaMeters) * 10) / 10);
    }
  }

  public moveVictimFarther(victimId: string, deltaMeters: number = 0.8): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.distanceMeters = Math.min(25.0, Math.round((v.distanceMeters + deltaMeters) * 10) / 10);
    }
  }

  public toggleWall(victimId: string): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.wallObstacle = !v.wallObstacle;
    }
  }

  public setSirenState(victimId: string, active: boolean): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.isSirenActive = active;
    }
  }

  public setVictimCondition(victimId: string, condition: VictimStatusCondition): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.condition = condition;
    }
  }

  public connectGatt(victimId: string): Promise<boolean> {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.connected = true;
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  public disconnectGatt(victimId: string): void {
    const v = this.virtualVictims.get(victimId);
    if (v) {
      v.connected = false;
    }
  }

  public readProfile(victimId: string): Promise<PublicVictimProfile | null> {
    const v = this.virtualVictims.get(victimId);
    return Promise.resolve(v ? v.profile : null);
  }

  public getAllVirtualVictims(): VirtualVictimState[] {
    return Array.from(this.virtualVictims.values());
  }
}

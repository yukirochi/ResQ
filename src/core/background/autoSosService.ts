import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { AppState, Vibration } from 'react-native';
import { useVictimsStore } from '../../store/victimsStore';

export interface AutoSosConfig {
  enabled: boolean;
  sensitivity: number; // Threshold for acceleration (g-force or m/s2)
  durationThresholdMs: number; // How long shaking must last
  countdownSeconds: number;
}

class AutoSosService {
  private static instance: AutoSosService;
  private subscription: any = null;
  private shakeCount = 0;
  private lastShakeTimestamp = 0;
  private config: AutoSosConfig = {
    enabled: false,
    sensitivity: 25, // Adjusted for standard m/s^2 thresholds (approx 2.5g)
    durationThresholdMs: 2000,
    countdownSeconds: 10,
  };

  private countdownTimer: NodeJS.Timeout | null = null;
  private currentCountdown = 0;
  private isCountingDown = false;
  
  // Callbacks for UI integration
  public onCountdownUpdate: ((secondsLeft: number) => void) | null = null;
  public onSosTriggered: (() => void) | null = null;

  private constructor() {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100); // 10Hz sampling
  }

  public static getInstance(): AutoSosService {
    if (!AutoSosService.instance) {
      AutoSosService.instance = new AutoSosService();
    }
    return AutoSosService.instance;
  }

  public setConfig(newConfig: Partial<AutoSosConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  public getConfig(): AutoSosConfig {
    return this.config;
  }

  public startMonitoring() {
    if (this.subscription) return; // Already monitoring

    this.subscription = accelerometer.subscribe(({ x, y, z }) => {
      // Calculate magnitude of acceleration vector
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (magnitude > this.config.sensitivity) {
        if (now - this.lastShakeTimestamp > 1000) {
          // Reset if it's been too long since last shake
          this.shakeCount = 0;
        }
        this.shakeCount++;
        this.lastShakeTimestamp = now;

        // If shaking continuously detected over multiple frames
        if (this.shakeCount >= 5 && !this.isCountingDown) {
          this.initiateSosCountdown();
        }
      }
    });
  }

  public stopMonitoring() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.cancelSos();
  }

  private initiateSosCountdown() {
    this.isCountingDown = true;
    this.currentCountdown = this.config.countdownSeconds;
    this.shakeCount = 0; // Reset for next time

    // Vibrate to alert user
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    if (this.onCountdownUpdate) {
      this.onCountdownUpdate(this.currentCountdown);
    }

    this.countdownTimer = setInterval(() => {
      this.currentCountdown--;
      
      if (this.onCountdownUpdate) {
        this.onCountdownUpdate(this.currentCountdown);
      }

      if (this.currentCountdown <= 0) {
        this.confirmSos();
      }
    }, 1000);
  }

  public cancelSos() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.isCountingDown = false;
    this.currentCountdown = 0;
    if (this.onCountdownUpdate) {
      this.onCountdownUpdate(0);
    }
  }

  public confirmSos() {
    this.cancelSos(); // Clear timer
    // Vibrate long
    Vibration.vibrate(1000);
    
    if (this.onSosTriggered) {
      this.onSosTriggered();
    }
    
    // Actually trigger SOS via App logic (e.g. enable Victim Mode)
    // Here we would hook into the victimStore/BLE Advertiser
    console.log('[AutoSOS] EMERGENCY SOS TRIGGERED BY MOTION!');
  }

  public getStatus() {
    return {
      enabled: this.config.enabled,
      isCountingDown: this.isCountingDown,
      secondsLeft: this.currentCountdown
    };
  }
}

export const autoSosService = AutoSosService.getInstance();

/**
 * ResQ Battery Optimization & Foreground Service Exemption
 * Essential for continuous BLE background beacon advertising when the phone is locked or trapped.
 */

import { Alert, Linking, Platform } from 'react-native';

export class BatteryOptimizationManager {
  /**
   * Prompts the user to whitelist ResQ from OS battery throttling
   */
  public static async requestBatteryExemption(): Promise<void> {
    if (Platform.OS !== 'android') return;

    Alert.alert(
      'Crucial Lifesaving Setting',
      'To keep broadcasting your emergency beacon when your phone screen turns off or battery is low, please disable battery optimization for ResQ.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]
    );
  }
}

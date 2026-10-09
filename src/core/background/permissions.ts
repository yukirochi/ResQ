/**
 * ResQ Permission Manager
 * Handles Android 12+ (API 31+) Bluetooth runtime permissions, location permissions, and notifications.
 */

import { PermissionsAndroid, Platform } from 'react-native';

export class PermissionManager {
  /**
   * Requests all necessary runtime permissions for BLE and Background operations
   */
  public static async requestAllPermissions(): Promise<{
    bluetoothGranted: boolean;
    notificationsGranted: boolean;
    locationGranted: boolean;
  }> {
    if (Platform.OS === 'ios') {
      // iOS CoreBluetooth permission is requested automatically on initialization
      return {
        bluetoothGranted: true,
        notificationsGranted: true,
        locationGranted: true,
      };
    }

    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;

      try {
        if (apiLevel >= 31) {
          // Android 12+: Scoped Bluetooth Permissions
          const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const bleScan = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
          const bleAdv = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED;
          const bleConn = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
          const notif = results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
          const loc = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

          return {
            bluetoothGranted: bleScan && bleAdv && bleConn,
            notificationsGranted: notif,
            locationGranted: loc,
          };
        } else {
          // Android 11 and below: Requires ACCESS_FINE_LOCATION for BLE scanning
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'ResQ Location Access Required',
              message: 'Bluetooth Low Energy scanning requires fine location access on Android 11 and below.',
              buttonPositive: 'Grant Access',
            }
          );

          return {
            bluetoothGranted: true,
            notificationsGranted: true,
            locationGranted: granted === PermissionsAndroid.RESULTS.GRANTED,
          };
        }
      } catch (err) {
        console.warn('[ResQ Permissions] Permission request failed:', err);
        return { bluetoothGranted: false, notificationsGranted: false, locationGranted: false };
      }
    }

    return { bluetoothGranted: true, notificationsGranted: true, locationGranted: true };
  }
}

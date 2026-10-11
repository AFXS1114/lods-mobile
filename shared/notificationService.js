import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { NOTIF_CHANNEL_ID } from './constants';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Requests notification permissions and returns the Expo Push Token.
 * Call this once after the user logs in.
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push tokens only work on physical devices.');
    return null;
  }

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL_ID, {
      name: 'LODS Order Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: true,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted.');
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    '78d2e3d7-d0d9-4c4b-a103-f2ed5f389b05';

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data;
}

/**
 * Saves the push token to the database for the logged-in user.
 * @param {string} table  - 'users' for riders, 'merchants' for merchants
 * @param {string} id     - the row id
 * @param {string} token  - the Expo push token
 */
export async function savePushToken(table, id, token) {
  if (!token || !id) return;
  await supabase.from(table).update({ push_token: token }).eq('id', id);
}

/**
 * Schedules a local (in-app) notification immediately.
 */
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // fire immediately
  });
}

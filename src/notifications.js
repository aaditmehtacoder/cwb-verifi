/**
 * Notifications during an event.
 *
 * Two layers, because a phone in a pocket and a phone in a hand need different
 * things:
 *
 *   in app   a quiet banner across the top of whatever screen you are on
 *   system   an OS notification, so a teacher who locked their phone still
 *            learns that the last open student was found
 *
 * Nothing here ever announces a status the app invented. A notification is only
 * raised when a person confirmed someone, or when the count reaches everyone.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let ready = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // an emergency tool should not add noise to a room
    shouldSetBadge: false,
  }),
});

export async function prepareNotifications() {
  if (ready || Platform.OS === 'web') return ready;
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (granted && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('event', {
        name: 'Event updates',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        vibrationPattern: [0, 120],
        enableVibrate: true,
      });
    }
    ready = granted;
    return granted;
  } catch {
    return false;
  }
}

/** Raise a system notification. Silent by design. */
export async function notify(title, body) {
  if (Platform.OS === 'web' || !ready) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: null, priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: null,
    });
  } catch {
    /* notification is a courtesy, never a dependency */
  }
}

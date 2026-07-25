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
      // An immediately-delivered local notification lands in the channel named
      // "default" on Android. Creating only an "event" channel is the classic
      // way to have alerts that work perfectly on iOS and arrive silently, or
      // not at all, on Android. Both are configured, identically.
      const channel = {
        name: 'Event updates',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null, // an emergency tool should not add noise to a room
        vibrationPattern: [0, 120],
        enableVibrate: true,
        lightColor: '#124F4C',
      };
      await Notifications.setNotificationChannelAsync('default', channel);
      await Notifications.setNotificationChannelAsync('event', channel);
    }
    ready = granted;
    return granted;
  } catch {
    return false;
  }
}

// Every notification this app raises is about a thing that happened once: a
// student was confirmed, an event started, the count closed. Realtime can
// deliver the same row twice and two screens can both react to it, so a key is
// remembered and a repeat is dropped rather than buzzing a teacher twice for
// one fact.
const alreadySent = new Set();

/**
 * Raise a real notification through the operating system.
 *
 * `key` identifies the fact, not the moment. Passing the same key again is a
 * no-op for the rest of the session.
 */
export async function notify(title, body, key) {
  if (Platform.OS === 'web') return { ok: false, reason: 'web has no OS notifications' };

  const id = key || `${title}|${body}`;
  if (alreadySent.has(id)) return { ok: false, reason: 'already sent' };
  alreadySent.add(id);

  if (!ready) {
    const granted = await prepareNotifications();
    if (!granted) return { ok: false, reason: 'permission not granted' };
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        // `false` for silence, never `null`. The native layer types this field
        // as boolean-or-string and rejects null outright with "type must be
        // either bool or string" — which throws before anything is delivered,
        // so every notification in the app failed, on every platform, while the
        // code above it looked entirely correct. `false` is the same intent:
        // an emergency tool should not add noise to a room.
        sound: false,
        interruptionLevel: 'timeSensitive',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver now
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/** Let a repeat through, for the test button that must fire every time. */
export function forget(key) {
  alreadySent.delete(key);
}

/**
 * Forget every fact, because the event they belonged to is over.
 *
 * The keys above are deliberately the fact rather than the moment, which is
 * right within one event and wrong across two: "Maya Reyes was confirmed" is a
 * different fact in the drill you are running now than in the one you ran
 * twenty minutes ago. Without this, a second run-through is completely silent —
 * every notification dropped as a duplicate of the first — which is exactly the
 * failure nobody notices until they are demonstrating the thing twice.
 */
export function resetNotifications() {
  alreadySent.clear();
}

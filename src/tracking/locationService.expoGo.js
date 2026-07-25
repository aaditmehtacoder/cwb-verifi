/**
 * Foreground GPS capture. Works inside Expo Go, which is where this runs today.
 *
 * Expo Go cannot hold a background location task, so a sweep pauses if the
 * screen locks. That is an OS limitation, not a bug, and the screen says so
 * rather than quietly losing the track. locationService.js holds the background
 * version for a development build.
 */
import * as Location from 'expo-location';

export async function requestPermission() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

/**
 * Start streaming fixes. Returns a stop function.
 * onFix receives { lat, lon, accuracy, altitude, at }.
 */
export async function watch(onFix) {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 1,
      timeInterval: 1000,
    },
    (p) =>
      onFix({
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        accuracy: p.coords.accuracy ?? 999,
        altitude: p.coords.altitude ?? null,
        at: p.timestamp || Date.now(),
      })
  );
  // expo-location's own teardown throws on web, and a failed unsubscribe must
  // never take the screen down with it.
  return () => {
    try {
      sub?.remove?.();
    } catch {
      /* already gone */
    }
  };
}

export const isBackgroundCapable = false;

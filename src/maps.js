/**
 * Handing a position to the map app the phone already has.
 *
 * Verifi draws a small map inline on iOS, but the moment somebody actually has
 * to walk to a place they want the app with turn-by-turn in it, not a 140 pixel
 * square inside ours. So every place shown here can be opened in Apple Maps on
 * iOS and in whatever handles `geo:` on Android, which is the one thing both
 * platforms have agreed on for a decade.
 */
import { Linking, Platform } from 'react-native';

/** The URL that opens this position in the platform's own map app. */
export function mapUrl({ lat, lon, label }) {
  if (lat == null || lon == null) return null;
  const name = encodeURIComponent(label || 'Confirmed here');
  if (Platform.OS === 'ios') {
    // Apple's documented scheme. `ll` centres the map, `q` labels the pin.
    return `https://maps.apple.com/?ll=${lat},${lon}&q=${name}&t=m`;
  }
  if (Platform.OS === 'android') {
    return `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
  }
  return `https://maps.apple.com/?ll=${lat},${lon}&q=${name}`;
}

/** What the button should say, since the app it opens differs by platform. */
export const mapAppName = Platform.OS === 'ios' ? 'Apple Maps' : 'Maps';

export async function openInMaps(where) {
  const url = mapUrl(where);
  if (!url) return { ok: false, reason: 'no position' };
  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

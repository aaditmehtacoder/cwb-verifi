/**
 * Where a confirmation happened.
 *
 * Verifi records the position of the staff phone at the moment a person vouches
 * for a student, not the student's own device. That distinction is the whole
 * privacy story: the school learns which part of the building a student was
 * accounted for in, and never tracks a child.
 *
 * Coordinates are turned into a room or zone name where one matches, because
 * "Science wing, north" is what a person can act on and a decimal pair is not.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

// Campus zones, in the order they are tested. A real deployment surveys these
// once. Verifi ships a small set so the naming works from the first event.
const ZONES = [
  { name: 'Science wing', radius: 60 },
  { name: 'Gymnasium', radius: 70 },
  { name: 'Library', radius: 50 },
  { name: 'Main building', radius: 90 },
  { name: 'Cafeteria', radius: 55 },
  { name: 'North lot, Gate B', radius: 80 },
];

const R_EARTH = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

export function metresBetween(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(s));
}

/**
 * Name a fix. The first fix of a session anchors the campus, so every later
 * reading is described relative to where the event is actually happening
 * rather than to coordinates baked in by whoever wrote the app.
 */
let anchor = null;

export function describe(fix) {
  if (!fix) return null;
  if (!anchor) {
    anchor = { lat: fix.lat, lon: fix.lon };
    return ZONES[0].name;
  }
  const d = metresBetween(anchor, fix);
  const zone = ZONES[Math.min(ZONES.length - 1, Math.floor(d / 60))];
  return d < 25 ? ZONES[0].name : `${zone.name}, ${Math.round(d)} m from first report`;
}

export function formatFix(fix) {
  if (!fix) return null;
  return `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)} ±${Math.round(fix.accuracy || 0)} m`;
}

/**
 * Live position for this device, for the duration of an event and no longer.
 *
 * `active` is wired to whether a drill or a live event is actually running. The
 * moment one ends the watch is torn down and the last fix is dropped, so a
 * phone that sat in a teacher's pocket during a drill is not still reporting an
 * hour later. Nothing here starts on launch; a screen asks when it needs to,
 * and iOS shows the reason string from app.json at that moment.
 */
export function useLiveLocation({ active = true } = {}) {
  const [fix, setFix] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | asking | on | denied | unavailable | off
  const sub = useRef(null);

  const stop = useCallback(() => {
    try {
      sub.current?.remove?.();
    } catch {
      /* already gone */
    }
    sub.current = null;
  }, []);

  const start = useCallback(async () => {
    if (sub.current) return;
    if (Platform.OS === 'web' && !navigator?.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    // Ask only when a screen actually needs a position. iOS shows the purpose
    // string from app.json here.
    const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      setStatus(canAskAgain ? 'denied' : 'blocked');
      return;
    }
    setStatus('on');
    try {
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFix({ lat: first.coords.latitude, lon: first.coords.longitude, accuracy: first.coords.accuracy, at: Date.now() });
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 4000 },
        (p) => setFix({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: Date.now() })
      );
    } catch {
      setStatus('unavailable');
    }
  }, []);

  // When the event ends, so does the tracking, without anyone remembering to
  // switch it off.
  useEffect(() => {
    if (!active) {
      stop();
      setFix(null);
      setStatus('off');
    }
  }, [active, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    fix: active ? fix : null,
    status,
    start,
    stop,
    place: active ? describe(fix) : null,
    coords: active ? formatFix(fix) : null,
  };
}

/** One reading, for stamping a single confirmation. */
export async function getFixOnce() {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: Date.now() };
  } catch {
    return null;
  }
}

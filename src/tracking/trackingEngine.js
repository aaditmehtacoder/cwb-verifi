/**
 * Pure track maths. No React, no Expo, no side effects, so it can be reasoned
 * about and tested on its own.
 *
 * In Verifi this records a staff sweep: the path someone actually walked while
 * looking for a student. An administrator can then see which corridors have
 * been covered instead of guessing. Same problem a run tracker solves, with
 * the same hazards: consumer GPS jitters indoors, drifts while standing still,
 * and reports nonsense fixes near steel and concrete.
 */

const R_EARTH = 6371008.8;
const toRad = (d) => (d * Math.PI) / 180;

/** Great circle distance in metres. */
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Tuning. Walking a building, not running a marathon.
export const CONFIG = {
  maxAccuracy: 30, // metres; drop fixes worse than this
  maxSpeed: 12, // m/s; anything faster is a bad fix, not a person
  minStep: 2.5, // metres; below this it is jitter, not movement
  autoPauseSpeed: 0.35, // m/s
  autoPauseAfter: 12000, // ms below that speed before the clock stops
  elevationDeadband: 1.5, // metres; ignore barometric noise
  kalmanNoise: 3, // metres per second of assumed process noise
};

/**
 * A one dimensional Kalman filter applied to latitude and longitude.
 * Variance grows with elapsed time and shrinks with each fix, so a run of
 * accurate readings pulls the track tight and a bad one barely moves it.
 */
export function createSmoother(noise = CONFIG.kalmanNoise) {
  let lat = null;
  let lon = null;
  let variance = -1;
  let at = 0;

  return {
    reset() {
      variance = -1;
    },
    push(fix) {
      if (variance < 0) {
        lat = fix.lat;
        lon = fix.lon;
        at = fix.at;
        variance = fix.accuracy * fix.accuracy;
        return { lat, lon };
      }
      const dt = Math.max(0, fix.at - at) / 1000;
      if (dt > 0) {
        variance += dt * noise * noise;
        at = fix.at;
      }
      const k = variance / (variance + fix.accuracy * fix.accuracy);
      lat += k * (fix.lat - lat);
      lon += k * (fix.lon - lon);
      variance *= 1 - k;
      return { lat, lon };
    },
  };
}

/** Should this raw fix be trusted at all? */
export function isUsable(fix, previous) {
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lon)) return false;
  if (fix.accuracy == null || fix.accuracy > CONFIG.maxAccuracy) return false;
  if (previous) {
    const dt = (fix.at - previous.at) / 1000;
    if (dt > 0 && haversine(previous, fix) / dt > CONFIG.maxSpeed) return false;
  }
  return true;
}

const emptyState = () => ({
  points: [],
  distance: 0,
  movingMs: 0,
  elapsedMs: 0,
  elevationGain: 0,
  speed: 0,
  paused: false,
  startedAt: null,
  lastAt: null,
  lastAltitude: null,
  slowSince: null,
});

/**
 * Fold a stream of fixes into a track.
 *
 * Auto pause is the piece people notice: standing still while you check a room
 * must not inflate moving time, and it must resume the moment the person walks
 * on, without them touching the phone.
 */
export function createTracker() {
  let state = emptyState();
  const smoother = createSmoother();

  return {
    get state() {
      return { ...state, points: state.points.slice() };
    },

    start(now = Date.now()) {
      state = emptyState();
      state.startedAt = now;
      state.lastAt = now;
      smoother.reset();
      return this.state;
    },

    add(raw) {
      if (!state.startedAt) return this.state;
      const previous = state.points[state.points.length - 1] || null;
      if (!isUsable(raw, previous)) return this.state;

      const smoothed = smoother.push(raw);
      const point = { lat: smoothed.lat, lon: smoothed.lon, at: raw.at, accuracy: raw.accuracy };

      state.elapsedMs = raw.at - state.startedAt;
      const dt = previous ? (raw.at - previous.at) / 1000 : 0;
      const step = previous ? haversine(previous, point) : 0;

      // Below the noise floor the person has not moved; do not add distance.
      const moved = step >= CONFIG.minStep;
      const speed = dt > 0 && moved ? step / dt : 0;
      state.speed = speed;

      if (speed < CONFIG.autoPauseSpeed) {
        state.slowSince = state.slowSince ?? raw.at;
        if (raw.at - state.slowSince >= CONFIG.autoPauseAfter) state.paused = true;
      } else {
        state.slowSince = null;
        state.paused = false;
      }

      if (moved) {
        state.distance += step;
        state.points.push(point);
      } else if (!previous) {
        state.points.push(point);
      } else {
        // Below the noise floor: keep the line honest by not adding distance,
        // but still move the head of the track so the map follows the person.
        state.points[state.points.length - 1] = point;
      }

      if (!state.paused && dt > 0) state.movingMs += dt * 1000;

      if (raw.altitude != null) {
        if (state.lastAltitude != null) {
          const climb = raw.altitude - state.lastAltitude;
          if (climb > CONFIG.elevationDeadband) {
            state.elevationGain += climb;
            state.lastAltitude = raw.altitude;
          } else if (climb < -CONFIG.elevationDeadband) {
            state.lastAltitude = raw.altitude;
          }
        } else {
          state.lastAltitude = raw.altitude;
        }
      }

      state.lastAt = raw.at;
      return this.state;
    },

    stop() {
      const final = this.state;
      state = emptyState();
      return final;
    },
  };
}

// ── Presentation helpers ─────────────────────────────────────────────────────

export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Minutes per kilometre, the number a person actually reads. */
export function formatPace(metres, movingMs) {
  if (metres < 20 || movingMs < 5000) return '--:--';
  const secPerKm = movingMs / 1000 / (metres / 1000);
  if (!Number.isFinite(secPerKm) || secPerKm > 3600) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

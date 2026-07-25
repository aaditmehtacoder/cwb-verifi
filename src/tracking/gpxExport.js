/**
 * A sweep written as GPX, so it can leave the app and land in whatever the
 * district already uses for incident records.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function toGpx(track, { name = 'Verifi sweep', by = 'Staff' } = {}) {
  const points = track.points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">` +
        `<time>${new Date(p.at).toISOString()}</time></trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Verifi" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(name)}</name>
    <desc>Recorded by ${esc(by)}</desc>
    <time>${new Date(track.startedAt || Date.now()).toISOString()}</time>
  </metadata>
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export async function exportGpx(track, meta) {
  if (!track?.points?.length) return { ok: false, reason: 'nothing recorded yet' };
  try {
    const path = `${FileSystem.cacheDirectory}verifi-sweep-${Date.now()}.gpx`;
    await FileSystem.writeAsStringAsync(path, toGpx(track, meta));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/gpx+xml', dialogTitle: 'Sweep' });
    }
    return { ok: true, path };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

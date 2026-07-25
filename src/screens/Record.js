import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { C, F, S, T, cardStyle } from '../theme';
import { Button, Rule } from '../components/ui';
import Icon from '../components/Icon';
import useActivityTracker from '../tracking/useActivityTracker';
import { formatDistance, formatDuration, formatPace } from '../tracking/trackingEngine';
import { exportGpx } from '../tracking/gpxExport';
import { useVerifi } from '../store';

/** The path walked so far, drawn to fit whatever box it is given. */
function TrackMap({ points, height = 190 }) {
  if (points.length < 2) {
    return (
      <View
        style={{
          height,
          borderRadius: 14,
          backgroundColor: '#E7EAE9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[T.small, { textAlign: 'center' }]}>
          The path appears here as you walk.
        </Text>
      </View>
    );
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const pad = 14;
  const w = 320;
  const h = height;
  const spanLat = Math.max(1e-6, maxLat - minLat);
  const spanLon = Math.max(1e-6, maxLon - minLon);
  const scale = Math.min((w - pad * 2) / spanLon, (h - pad * 2) / spanLat);
  const x = (lon) => pad + (lon - minLon) * scale + (w - pad * 2 - spanLon * scale) / 2;
  const y = (lat) => h - pad - (lat - minLat) * scale - (h - pad * 2 - spanLat * scale) / 2;

  const line = points.map((p) => `${x(p.lon).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <View style={{ height, borderRadius: 14, backgroundColor: '#E7EAE9', overflow: 'hidden' }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <Polyline
          points={line}
          fill="none"
          stroke={C.accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={x(points[0].lon)} cy={y(points[0].lat)} r={5} fill={C.inkSoft} />
        <Circle cx={x(last.lon)} cy={y(last.lat)} r={6} fill={C.verified} stroke="#FFFFFF" strokeWidth={2} />
      </Svg>
    </View>
  );
}

function Stat({ label, value, wide }) {
  return (
    <View style={{ flex: wide ? 1.4 : 1 }}>
      <Text style={T.label}>{label}</Text>
      <Text
        style={{
          fontFamily: F.monoSemi,
          fontSize: wide ? 34 : 22,
          color: C.ink,
          marginTop: 2,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function Record({ navigate }) {
  const { staffName } = useVerifi();
  const { running, permission, track, start, stop, isBackgroundCapable } = useActivityTracker();
  const [saved, setSaved] = useState(null);
  const [note, setNote] = useState(null);

  const onStop = () => {
    const final = stop();
    setSaved(final);
  };

  const shown = saved || track;

  return (
    <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
        <View style={{ flex: 1 }}>
          <Text style={T.title}>Sweep</Text>
          <Text style={[T.small, { marginTop: 2 }]}>
            Record the ground you actually covered, so the board shows what has been searched.
          </Text>
        </View>
        <Icon name="scan" size={24} />
      </View>

      <View style={{ marginTop: S.lg }}>
        <TrackMap points={shown.points} />
      </View>

      <View style={[cardStyle, { marginTop: S.md, padding: S.lg }]}>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <Stat label="Distance" value={formatDistance(shown.distance)} wide />
          <Stat label="Moving" value={formatDuration(shown.movingMs)} />
        </View>
        <Rule style={{ marginVertical: S.md }} />
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <Stat label="Pace / km" value={formatPace(shown.distance, shown.movingMs)} />
          <Stat label="Elapsed" value={formatDuration(shown.elapsedMs)} />
          <Stat label="Climb" value={`${Math.round(shown.elevationGain)} m`} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: running ? (shown.paused ? C.pending : C.verified) : C.absent,
            }}
          />
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>
            {running
              ? shown.paused
                ? 'auto paused, standing still'
                : `recording · ${shown.points.length} points`
              : saved
              ? `saved · ${shown.points.length} points`
              : 'ready'}
          </Text>
        </View>
      </View>

      {permission === false ? (
        <Text style={[T.small, { marginTop: S.md, color: C.pending }]}>
          Location permission was refused, so there is nothing to record.
        </Text>
      ) : null}

      {running ? (
        <Button title="Finish sweep" variant="verified" style={{ marginTop: S.lg }} onPress={onStop} />
      ) : (
        <Button
          title={saved ? 'Start another sweep' : 'Start sweep'}
          style={{ marginTop: S.lg }}
          onPress={() => {
            setSaved(null);
            setNote(null);
            start();
          }}
        />
      )}

      {saved && saved.points.length > 1 ? (
        <Button
          title="Export as GPX"
          variant="secondary"
          style={{ marginTop: S.sm }}
          onPress={async () => {
            const r = await exportGpx(saved, { by: staffName, name: `Verifi sweep by ${staffName}` });
            setNote(r.ok ? 'Exported.' : r.reason);
          }}
        />
      ) : null}

      {note ? <Text style={[T.small, { marginTop: S.sm }]}>{note}</Text> : null}

      {!isBackgroundCapable ? (
        <Text style={[T.small, { marginTop: S.lg, fontSize: 12 }]}>
          In Expo Go the sweep pauses if the screen locks, which is an operating system limit rather
          than a setting. A development build records with the screen off.
        </Text>
      ) : null}

      <Button title="Back to the board" variant="quiet" style={{ marginTop: S.md }} onPress={() => navigate('admin')} />
    </ScrollView>
  );
}

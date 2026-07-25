import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import Where from './Where';
import { Rule } from './ui';
import { fetchTrack, subscribeToTracking } from '../supabase';
import { isLocating } from '../store';

/**
 * Where a student's own phone has said it is.
 *
 * The newest fix is drawn on a map; everything before it is a list of times and
 * places. Deliberately not a breadcrumb trail across a floor plan: a staff
 * member deciding where to walk needs the last known position and how stale it
 * is, and a path made of five points and a lot of interpolation invites people
 * to believe a route the data does not support.
 *
 * The age of the newest fix is given more weight than the fix itself, because
 * "two minutes ago" and "nineteen minutes ago" are different instructions.
 */
const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

function ago(iso) {
  if (!iso) return '';
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ago`;
}

export default function Track({ student, tracking, live, style }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const id = student?.id;

  // The freshness line has to keep counting even when nothing new arrives.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!id || !live) {
      setLoading(false);
      return;
    }
    const rows = await fetchTrack(id);
    setPoints(rows || []);
    setLoading(false);
  }, [id, live]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!live || !id) return undefined;
    return subscribeToTracking({
      onPoint: (p) => {
        if (p.student_id !== id) return;
        setPoints((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
      },
    });
  }, [live, id]);

  const latest = points[0];
  const locating = isLocating(tracking);

  return (
    <View style={[{ gap: S.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: locating ? C.verified : C.absent,
          }}
        />
        <Text style={[T.label, { flex: 1, fontSize: 10 }]}>
          {locating ? 'Reporting now' : 'Not reporting'}
        </Text>
        {latest ? (
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>{ago(latest.created_at)}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={T.small}>Reading the track</Text>
        </View>
      ) : !latest ? (
        <Text style={T.small}>
          {locating
            ? 'Their phone has agreed but has not reported a position yet. This is normal indoors and usually takes a few seconds.'
            : 'No positions have been reported.'}
        </Text>
      ) : (
        <>
          {/* The newest fix, on Apple Maps on iPhone. */}
          <Where
            lat={latest.lat}
            lon={latest.lon}
            accuracy={latest.accuracy}
            place={latest.place || 'reported position'}
            label={`${student?.name || 'Student'}, last reported`}
          />

          {points.length > 1 ? (
            <View>
              <Text style={[T.label, { fontSize: 10, marginBottom: S.xs }]}>Earlier</Text>
              {points.slice(1, 6).map((p) => (
                <View key={p.id}>
                  <Rule />
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, gap: S.md }}>
                    <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, width: 66 }}>
                      {clock(p.created_at)}
                    </Text>
                    <Text style={{ flex: 1, fontFamily: F.ui, fontSize: 13, color: C.ink }}>
                      {p.place || `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`}
                    </Text>
                    {p.accuracy ? (
                      <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }}>
                        ±{Math.round(p.accuracy)}m
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* A position is where a phone was, which is not the same as where a
              child is. Saying so beside the map is the whole product. */}
          <Text style={[T.small, { fontSize: 12 }]}>
            This is where their phone reported being. A staff member still has to see them before the
            count moves.
          </Text>
        </>
      )}
    </View>
  );
}

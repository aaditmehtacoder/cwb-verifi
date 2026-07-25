import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CLUSTERS, MAYA, OFF_ROSTER } from './data';
import { describe, getFixOnce } from './location';
import { notify, prepareNotifications } from './notifications';
import {
  boardStatus,
  currentUser,
  fetchStudents,
  isConfigured,
  logScan,
  pushConfirmation,
  staffNameFrom,
  subscribeToBoard,
} from './supabase';

const VerifiContext = createContext(null);
const SAVE_KEY = 'verifi:event:v1';

// Remote rows come back flat; the field wants them grouped the way the school is.
function groupIntoClusters(rows) {
  const byCluster = new Map(CLUSTERS.map((c) => [c.name, []]));
  rows.forEach((r) => {
    if (!byCluster.has(r.cluster)) byCluster.set(r.cluster, []);
    byCluster.get(r.cluster).push({
      id: r.id,
      name: r.name,
      initials: r.initials,
      cluster: r.cluster,
      status: r.status,
      confirmedBy: r.confirmed_by || null,
      confirmedAt: r.confirmed_at || null,
      place: r.place || null,
      coords: r.lat != null ? { lat: r.lat, lon: r.lon, accuracy: r.accuracy } : null,
    });
  });
  return CLUSTERS.map((c) => ({ ...c, students: byCluster.get(c.name) || [] }));
}

const clone = (cs) => cs.map((c) => ({ ...c, students: c.students.map((s) => ({ ...s })) }));

function tick(iso) {
  const started = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const buzz = (kind) => {
  if (Platform.OS === 'web') return;
  const map = {
    confirm: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    weighty: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  };
  (map[kind] || map.tap)().catch(() => {});
};

export function VerifiProvider({ children }) {
  const [clusters, setClusters] = useState(() => clone(CLUSTERS));
  const [mode, setMode] = useState('drill');
  const [ringingId, setRingingId] = useState(null);
  const [dimField, setDimField] = useState(false);
  const [allClear, setAllClear] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [eventActive, setEventActive] = useState(true);
  const [elapsed, setElapsed] = useState('00:00');
  const [loaded, setLoaded] = useState(false);

  // Who this phone is, when it is a student showing a code.
  const [meId, setMeId] = useState(MAYA.id);

  const [board, setBoard] = useState(isConfigured() ? 'connecting' : 'this phone only');
  const [notice, setNotice] = useState(null);
  const [user, setUser] = useState(null);
  const live = board === 'live';
  const liveRef = useRef(false);
  liveRef.current = live;

  const all = useMemo(() => clusters.flatMap((c) => c.students), [clusters]);

  const raise = useCallback((n) => {
    setNotice({ ...n, key: `${n.title}:${Date.now()}` });
    if (n.system !== false) notify(n.title, n.detail || '');
  }, []);

  useEffect(() => {
    prepareNotifications();
  }, []);

  // ── Restore an event in progress ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.clusters?.length) setClusters(saved.clusters);
          if (saved?.startedAt) setStartedAt(saved.startedAt);
          if (saved?.mode) setMode(saved.mode);
          if (saved?.meId) setMeId(saved.meId);
          if (typeof saved?.eventActive === 'boolean') setEventActive(saved.eventActive);
        }
      } catch {
        /* first run */
      }
      setLoaded(true);
    })();
  }, []);

  // Closing the app mid-drill must not lose who has been confirmed.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ clusters, startedAt, mode, meId, eventActive })).catch(() => {});
  }, [clusters, startedAt, mode, meId, eventActive, loaded]);

  // ── The shared board ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isConfigured()) return;
      const problem = await boardStatus();
      if (cancelled) return;
      if (problem) {
        setBoard(problem);
        return;
      }
      const rows = await fetchStudents();
      if (cancelled) return;
      if (rows?.length) setClusters(groupIntoClusters(rows));
      setBoard('live');
      setUser(await currentUser());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    return subscribeToBoard((row) => {
      setClusters((prev) =>
        prev.map((c) => ({
          ...c,
          students: c.students.map((s) =>
            s.id === row.id
              ? { ...s, status: row.status, confirmedBy: row.confirmed_by, confirmedAt: row.confirmed_at }
              : s
          ),
        }))
      );
      if (row.status === 'verified') {
        buzz('tap');
        setRingingId(row.id);
        setTimeout(() => setRingingId(null), 1400);
        raise({
          title: `${row.name} confirmed`,
          detail: [row.confirmed_by, row.place].filter(Boolean).join(' · ') || 'by a staff member',
          status: 'verified',
          at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          studentId: row.id,
        });
      }
    });
  }, [live, raise]);

  // ── The event clock ────────────────────────────────────────────────────────
  useEffect(() => {
    setElapsed(tick(startedAt));
    const id = setInterval(() => setElapsed(tick(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const counts = useMemo(() => {
    const c = { verified: 0, pending: 0, absent: 0, reunified: 0 };
    all.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [all]);

  const staffName = useMemo(() => (user ? staffNameFrom(user) : 'R. Alvarez'), [user]);
  const me = useMemo(() => all.find((s) => s.id === meId) || all[0], [all, meId]);

  const setStatus = useCallback((studentId, status, extra = {}) => {
    setClusters((prev) =>
      prev.map((cl) => ({
        ...cl,
        students: cl.students.map((s) => (s.id === studentId ? { ...s, status, ...extra } : s)),
      }))
    );
  }, []);

  // The confirmation. A human, never the AI, never a scan on its own, moves a
  // tile to verified. Local first so the room sees it instantly, then shared.
  const confirmStudent = useCallback(
    (studentId, opts = {}) => {
      const by = opts.by || staffName;
      const at = new Date().toISOString();
      buzz('confirm');
      setStatus(studentId, 'verified', { confirmedBy: by, confirmedAt: at, place: opts.place || null });

      setRingingId(studentId);
      setDimField(true);
      setTimeout(() => setDimField(false), 700);
      setTimeout(() => setRingingId(null), 1400);

      // The fix is read after the tile moves, so a slow GPS never delays the
      // one action a person came here to take.
      const remaining = all.filter((s) => s.status === 'pending' && s.id !== studentId).length;
      if (remaining === 0) {
        raise({
          title: 'Every student accounted for',
          detail: `${counts.verified + 1} confirmed by a person`,
          status: 'verified',
          at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      (async () => {
        const fix = opts.fix || (await getFixOnce());
        const place = opts.place || describe(fix);
        if (fix || place) setStatus(studentId, 'verified', { coords: fix, place });
        if (liveRef.current) pushConfirmation(studentId, by, { fix, place });
        if (liveRef.current && opts.code) logScan(studentId, by, opts.code, fix);
      })();
    },
    [setStatus, staffName, all, counts.verified, raise]
  );

  const markNotWithClass = useCallback(
    (studentId) => {
      buzz('weighty');
      setStatus(studentId, 'pending', { confirmedBy: null, confirmedAt: null });
    },
    [setStatus]
  );

  const undoConfirm = useCallback(
    (studentId) => {
      buzz('tap');
      setStatus(studentId, 'pending', { confirmedBy: null, confirmedAt: null });
    },
    [setStatus]
  );

  // A student standing in a room that is not theirs.
  const addOffRoster = useCallback(
    (clusterName) => {
      buzz('confirm');
      setClusters((prev) => {
        if (prev.some((c) => c.students.some((s) => s.id === OFF_ROSTER.id))) return prev;
        return prev.map((c) =>
          c.name === clusterName
            ? {
                ...c,
                students: [
                  ...c.students,
                  {
                    ...OFF_ROSTER,
                    cluster: clusterName,
                    status: 'verified',
                    confirmedBy: staffName,
                    confirmedAt: new Date().toISOString(),
                  },
                ],
              }
            : c
        );
      });
    },
    [staffName]
  );

  const startNewEvent = useCallback(() => {
    buzz('weighty');
    setClusters(clone(CLUSTERS));
    setStartedAt(new Date().toISOString());
    setAllClear(false);
    setAnnouncement(null);
    setRingingId(null);
    setEventActive(true);
  }, []);

  // Ending the event is what switches location off across every screen.
  const endEvent = useCallback(() => {
    buzz('weighty');
    setEventActive(false);
    setAllClear(false);
  }, []);

  const value = useMemo(
    () => ({
      clusters,
      all,
      counts,
      mode,
      setMode,
      ringingId,
      dimField,
      allClear,
      setAllClear,
      announcement,
      setAnnouncement,
      confirmStudent,
      markNotWithClass,
      notice,
      clearNotice: () => setNotice(null),
      raise,
      undoConfirm,
      addOffRoster,
      setStatus,
      startNewEvent,
      endEvent,
      eventActive,
      reset: startNewEvent,
      elapsed,
      startedAt,
      board,
      live,
      user,
      setUser,
      staffName,
      me,
      meId,
      setMeId,
      buzz,
      maya: all.find((s) => s.id === MAYA.id),
    }),
    [clusters, all, counts, mode, ringingId, dimField, allClear, announcement, notice, raise, confirmStudent, markNotWithClass, undoConfirm, addOffRoster, setStatus, startNewEvent, endEvent, eventActive, elapsed, startedAt, board, live, user, staffName, me, meId]
  );

  return <VerifiContext.Provider value={value}>{children}</VerifiContext.Provider>;
}

export function useVerifi() {
  const ctx = useContext(VerifiContext);
  if (!ctx) throw new Error('useVerifi must be used inside VerifiProvider');
  return ctx;
}

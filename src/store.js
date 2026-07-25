import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CLUSTERS, EVENT_PASSWORD, MAYA, OFF_ROSTER, TEACHERS } from './data';
import { describe, getFixOnce } from './location';
import { notify, prepareNotifications } from './notifications';
import {
  boardStatus,
  currentUser,
  fetchStudents,
  isConfigured,
  logScan,
  pushConfirmation,
  pushReunification,
  resetBoard,
  searchStudents,
  sendMessage,
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
    byCluster.get(r.cluster).push(fromRow(r));
  });
  return CLUSTERS.map((c) => ({ ...c, students: byCluster.get(c.name) || [] }));
}

/** One board row, in the shape the screens read. */
export function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials,
    cluster: r.cluster,
    grade: r.grade || null,
    code: r.code || null,
    guardianCode: r.guardian_code || null,
    status: r.status,
    confirmedBy: r.confirmed_by || null,
    confirmedAt: r.confirmed_at || null,
    method: r.method || null,
    place: r.place || null,
    coords: r.lat != null ? { lat: r.lat, lon: r.lon, accuracy: r.accuracy } : null,
  };
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
  // Nothing runs until an administrator starts it.
  const [eventActive, setEventActive] = useState(false);
  const [startedBy, setStartedBy] = useState(null);
  const [teacherId, setTeacherId] = useState(TEACHERS[0].id);
  const [consent, setConsent] = useState(null);
  const [elapsed, setElapsed] = useState('00:00');
  const [loaded, setLoaded] = useState(false);

  // Who this phone is, when it is a student showing a code.
  const [meId, setMeId] = useState(MAYA.id);

  const [board, setBoard] = useState(isConfigured() ? 'connecting' : 'this phone only');
  const [user, setUser] = useState(null);
  const live = board === 'live';
  const liveRef = useRef(false);
  liveRef.current = live;

  const all = useMemo(() => clusters.flatMap((c) => c.students), [clusters]);

  const raiseRef = useRef(null);

  /**
   * One fact, one notification, delivered by the operating system.
   * `key` is the fact itself, so the same confirmation arriving twice over
   * realtime does not buzz a teacher twice.
   */
  const raise = useCallback((n) => {
    notify(n.title, n.detail || '', n.key);
  }, []);

  raiseRef.current = raise;

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
          if (saved?.startedBy) setStartedBy(saved.startedBy);
          if (saved?.teacherId) setTeacherId(saved.teacherId);
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
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ clusters, startedAt, mode, meId, eventActive, startedBy, teacherId })).catch(() => {});
  }, [clusters, startedAt, mode, meId, eventActive, startedBy, teacherId, loaded]);

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
          key: `confirmed:${row.id}`,
          title: `${row.name} confirmed`,
          detail: [row.confirmed_by, row.place].filter(Boolean).join(' · ') || 'by a staff member',
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
        students: cl.students.map((s) =>
          s.id === studentId ? { ...s, ...(status ? { status } : null), ...extra } : s
        ),
      }))
    );
  }, []);

  /**
   * The confirmation. A human, never the AI, never a scan on its own, moves a
   * tile to verified. Local first so the room sees it instantly, then shared.
   *
   * `method` is how the staff member established that this is the right child:
   *
   *   qr        the student's rotating code, read off their screen
   *   recited   they had no phone and said their fixed code out loud
   *   roster    a teacher ticking their own room
   *   vouched   a staff member's word alone, no code of any kind
   *
   * It is carried all the way to the board because the four are not equally
   * strong, and an event that gets reviewed afterwards has to be able to tell
   * them apart. Nothing in the interface treats them differently in the moment:
   * a person vouched, the count moves, that is the product.
   */
  const confirmStudent = useCallback(
    (studentId, opts = {}) => {
      const by = opts.by || staffName;
      const at = new Date().toISOString();
      const method = opts.method || 'roster';
      buzz('confirm');
      setStatus(studentId, 'verified', {
        confirmedBy: by,
        confirmedAt: at,
        method,
        place: opts.place || null,
      });

      setRingingId(studentId);
      setDimField(true);
      setTimeout(() => setDimField(false), 700);
      setTimeout(() => setRingingId(null), 1400);

      // The fix is read after the tile moves, so a slow GPS never delays the
      // one action a person came here to take.
      const remaining = all.filter((s) => s.status === 'pending' && s.id !== studentId).length;
      if (remaining === 0) {
        raise({
          key: `allclear:${startedAt}`,
          title: 'Every student accounted for',
          detail: `${counts.verified + 1} confirmed by a person`,
        });
      }

      (async () => {
        const fix = opts.fix || (await getFixOnce());
        const place = opts.place || describe(fix);
        if (fix || place) setStatus(studentId, 'verified', { coords: fix, place });
        if (liveRef.current) pushConfirmation(studentId, by, { fix, place, method });
        if (liveRef.current) logScan(studentId, by, opts.code || null, fix, method);
      })();
    },
    [setStatus, staffName, all, counts.verified, raise, startedAt]
  );

  /**
   * A student handed to their guardian at the gate.
   *
   * This is the one status that is not "accounted for on campus", and it is the
   * one mistake in an event that cannot be undone afterwards, so it is kept
   * separate from a confirmation rather than folded into it. A row lands beside
   * the status saying which adult took them and which member of staff released
   * them; that record is the point, and a status field alone cannot hold it.
   */
  const reunify = useCallback(
    (studentId, { guardianName, by, passCode } = {}) => {
      const releasedBy = by || staffName;
      const at = new Date().toISOString();
      buzz('confirm');
      setStatus(studentId, 'reunified', {
        confirmedBy: releasedBy,
        confirmedAt: at,
        method: 'guardian',
        place: 'Gate B, reunification',
      });
      setRingingId(studentId);
      setTimeout(() => setRingingId(null), 1400);

      const student = all.find((s) => s.id === studentId);
      raiseRef.current?.({
        key: `reunified:${studentId}`,
        title: `${student?.name || 'A student'} released`,
        detail: `to ${guardianName || 'a guardian'} by ${releasedBy}`,
      });

      if (liveRef.current) {
        pushReunification({ studentId, guardianName, releasedBy, passCode });
      }
      return { ok: true };
    },
    [setStatus, staffName, all]
  );

  /**
   * Search the board, not this phone's copy of it.
   *
   * The no-phone path has to be able to find a student this device never
   * loaded, so it asks Postgres when there is a Postgres to ask and falls back
   * to the roster in memory when there is not. Either way the caller gets the
   * same shape and never has to know which happened.
   */
  const findStudents = useCallback(
    async (term) => {
      const q = String(term || '').trim();
      if (q.length < 2) return [];

      if (liveRef.current) {
        const rows = await searchStudents(q);
        if (rows) {
          // Prefer the copy already on screen, so a match reflects a
          // confirmation that landed a second ago over what the query returned.
          return rows.map((r) => all.find((s) => s.id === r.id) || fromRow(r));
        }
      }
      const needle = q.toLowerCase();
      return all.filter((s) => s.name.toLowerCase().includes(needle)).slice(0, 12);
    },
    [all]
  );

  /** Put the shared board back to its opening position, mid-demo, from a phone. */
  const resetSharedBoard = useCallback(async () => {
    buzz('weighty');
    setClusters(clone(CLUSTERS));
    setStartedAt(new Date().toISOString());
    setAllClear(false);
    setAnnouncement(null);
    setRingingId(null);
    setConsent(null);
    if (!liveRef.current) return { ok: true, local: true };
    return resetBoard();
  }, []);

  /**
   * A teacher saying a student is not in their room.
   *
   * That is a statement about this room, not about the school. If somebody else
   * has already laid eyes on the student — the nurse at a checkpoint, another
   * teacher whose room they wandered into — then this must not touch their
   * status. Letting a teacher's "not here" silently erase another staff
   * member's confirmation would take a found child and make them missing again,
   * which is the worst thing this app could do.
   *
   * Returns what actually happened so the screen can say it out loud.
   */
  const markNotWithClass = useCallback(
    (studentId) => {
      const student = all.find((s) => s.id === studentId);
      if (student?.status === 'verified' || student?.status === 'reunified') {
        buzz('tap');
        return { changed: false, student };
      }
      buzz('weighty');
      setStatus(studentId, 'pending', { confirmedBy: null, confirmedAt: null, method: null });
      return { changed: true, student };
    },
    [setStatus, all]
  );

  /**
   * The last time a teacher saw a student they cannot account for.
   *
   * Worth almost nothing on its own and a great deal next to four other
   * reports. It goes down the shared thread because the person who needs it is
   * whoever is deciding where to send the next search, and they are not in this
   * room.
   */
  const reportLastSeen = useCallback(
    async (studentId, where, by) => {
      const student = all.find((s) => s.id === studentId);
      // The report belongs to whoever holds the room, which is not necessarily
      // the account signed in on this phone.
      const author = by || staffName;
      const at = new Date().toISOString();
      setStatus(studentId, undefined, { lastSeen: where, lastSeenAt: at, lastSeenBy: author });
      raiseRef.current?.({
        key: `lastseen:${studentId}:${at}`,
        title: `${student?.name || 'A student'} last seen`,
        detail: `${where}, reported by ${author}`,
      });
      if (liveRef.current) {
        await sendMessage({
          author,
          role: 'staff',
          body: `${student?.name || studentId} is not in my room. Last seen: ${where}.`,
        });
      }
      return { ok: true };
    },
    [all, setStatus, staffName]
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

  /**
   * Only an administrator starts an event, and only with the word. Everything
   * else in the app stays inert until this returns true: no location, no count
   * moving, no alerts.
   */
  const startEvent = useCallback(
    async ({ password, by = 'An administrator', kind = 'drill' }) => {
      if (String(password || '').trim().toLowerCase() !== EVENT_PASSWORD) {
        return { ok: false, reason: 'That is not the start word.' };
      }
      buzz('weighty');
      const startedAtNow = new Date().toISOString();
      setClusters(clone(CLUSTERS));
      setStartedAt(startedAtNow);
      setAllClear(false);
      setAnnouncement(null);
      setRingingId(null);
      setMode(kind);
      setStartedBy(by);
      setEventActive(true);

      const line =
        kind === 'drill'
          ? `Drill started by ${by}. Confirm your room and report anything unusual here.`
          : `Lockdown started by ${by}. Confirm your room now.`;

      raiseRef.current?.({
        key: `started:${startedAtNow}`,
        title: kind === 'drill' ? 'Drill started' : 'Lockdown started',
        detail: `by ${by}. Confirm your room.`,
      });

      // Every other phone learns from the thread, which they are all watching.
      if (liveRef.current) await sendMessage({ author: by, role: 'system', body: line });
      return { ok: true };
    },
    []
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
  const endEvent = useCallback(
    async ({ by = 'An administrator' } = {}) => {
      buzz('weighty');
      setEventActive(false);
      setAllClear(false);
      setStartedBy(null);
      if (liveRef.current) {
        await sendMessage({ author: by, role: 'system', body: `Event ended by ${by}.` });
      }
    },
    []
  );

  /**
   * A student is missing and nobody can find them. An administrator can ask
   * that student's own phone where it is. The request is exactly that: a
   * request. It travels down the shared thread, the student's screen shows it,
   * and nothing at all is sent unless they agree.
   */
  const askStudentForLocation = useCallback(
    async (studentId, byWho) => {
      const who = byWho || staffName;
      setConsent({ studentId, by: who, at: Date.now(), state: 'asked' });
      raiseRef.current?.({
        key: `consent-ask:${studentId}:${Date.now()}`,
        title: 'Location requested',
        detail: `${who} asked the student to share where they are`,
      });
      if (liveRef.current) {
        await sendMessage({
          author: who,
          role: 'system',
          body: `CONSENT_ASK:${studentId}:${who}`,
        });
      }
      return { ok: true };
    },
    [staffName]
  );

  /** The student's answer. Refusing is a first class outcome, not a failure. */
  const answerConsent = useCallback(
    async (studentId, agreed, place) => {
      setConsent((c) => (c && c.studentId === studentId ? { ...c, state: agreed ? 'shared' : 'refused', place } : c));
      if (agreed && place) setStatus(studentId, undefined, { sharedPlace: place });
      raiseRef.current?.({
        key: `consent-answer:${studentId}:${agreed}`,
        title: agreed ? 'Student shared their location' : 'Student declined',
        detail: agreed ? place || 'location received' : 'nothing was sent',
      });
      if (liveRef.current) {
        await sendMessage({
          author: 'Student device',
          role: 'system',
          body: agreed ? `CONSENT_SHARED:${studentId}:${place || 'unknown'}` : `CONSENT_REFUSED:${studentId}`,
        });
      }
    },
    [setStatus]
  );

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
      reunify,
      findStudents,
      resetSharedBoard,
      markNotWithClass,
      reportLastSeen,
      consent,
      askStudentForLocation,
      answerConsent,
      raise,
      undoConfirm,
      addOffRoster,
      setStatus,
      startNewEvent,
      startEvent,
      endEvent,
      eventActive,
      startedBy,
      teachers: TEACHERS,
      teacherId,
      setTeacherId,
      teacher: TEACHERS.find((t) => t.id === teacherId) || TEACHERS[0],
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
    [clusters, all, counts, mode, ringingId, dimField, allClear, announcement, raise, confirmStudent, reunify, findStudents, resetSharedBoard, markNotWithClass, reportLastSeen, undoConfirm, addOffRoster, setStatus, startNewEvent, startEvent, endEvent, eventActive, startedBy, teacherId, consent, askStudentForLocation, answerConsent, elapsed, startedAt, board, live, user, staffName, me, meId]
  );

  return <VerifiContext.Provider value={value}>{children}</VerifiContext.Provider>;
}

export function useVerifi() {
  const ctx = useContext(VerifiContext);
  if (!ctx) throw new Error('useVerifi must be used inside VerifiProvider');
  return ctx;
}

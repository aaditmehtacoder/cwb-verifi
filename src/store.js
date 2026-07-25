import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CLUSTERS, EVENT_PASSWORD, MAYA, OFF_ROSTER, TEACHERS } from './data';
import { describe, getFixOnce } from './location';
import { notify, prepareNotifications, resetNotifications } from './notifications';
import {
  boardStatus,
  currentUser,
  fetchStudents,
  isConfigured,
  logScan,
  fetchTracking,
  pushConfirmation,
  pushReunification,
  pushTrackingAnswer,
  pushTrackingAsk,
  pushTrackingEnd,
  pushTrackingOverride,
  resetBoard,
  searchStudents,
  sendMessage,
  staffNameFrom,
  subscribeToBoard,
  subscribeToTracking,
} from './supabase';

const VerifiContext = createContext(null);
const SAVE_KEY = 'verifi:event:v1';

/**
 * Which person each screen is being used as.
 *
 * In the field these are five different people holding five different phones: a
 * parent's device only ever runs the parent view and never learns another
 * child's name. Here one device impersonates all five, and notifications are
 * the one place that fiction leaks — a confirmation announcing "R. Alvarez ·
 * Science wing" on the parent screen hands a family the location the parent
 * screen spends four languages refusing to show.
 *
 * So every notification declares who it is for, and a phone only ever raises
 * the ones belonging to whoever it is currently being. Routes with no role —
 * home, sign in, the ready check — raise nothing.
 */
const ROLE_FOR_ROUTE = {
  parent: 'parent',
  student: 'student',
  teacher: 'teacher',
  scan: 'staff',
  chat: 'staff',
  admin: 'admin',
  allclear: 'admin',
  start: 'admin',
};

export const roleForRoute = (route) => ROLE_FOR_ROUTE[route] || null;

// Anything that happened while this phone was being somebody else. Held so the
// moment is not lost, capped so switching views is never a wall of alerts.
const QUEUE_LIMIT = 3;

// How long a student's phone may report its position before the permission
// lapses on its own. Long enough to find somebody in a large building, short
// enough that a drill nobody remembered to close is not still tracking a child
// at home that evening.
export const TRACK_MINUTES = 30;

/** The two states in which a student's device is actually reporting. */
export const isLocating = (t) => t?.state === 'sharing' || t?.state === 'overridden';

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
  // Read inside the realtime callback, which closes over its first render.
  const teacherRef = useRef(TEACHERS[0]);
  // studentId → { state, askedBy, askedAt, answeredAt, overriddenBy,
  //               overrideReason, endedReason, expiresAt }
  const [tracking, setTracking] = useState({});
  const setTrack = useCallback((studentId, patch) => {
    setTracking((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ...patch } }));
  }, []);
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

  // Which screen this phone is on, and therefore who it is being.
  const [view, setView] = useState('home');
  const role = roleForRoute(view);
  const roleRef = useRef(null);
  roleRef.current = role;
  const pending = useRef({});

  const raiseRef = useRef(null);

  /**
   * Students this phone has just acted on.
   *
   * Supabase sends a phone its own writes back over realtime, so without a
   * record of what we did ourselves there is no way to tell "somebody across
   * the building found her" from "you tapped a button half a second ago". Ids
   * are held briefly, then dropped, so a genuine later change by another member
   * of staff still announces itself.
   */
  const mine = useRef(new Set());
  const claim = useCallback((studentId) => {
    mine.current.add(studentId);
    setTimeout(() => mine.current.delete(studentId), 15000);
  }, []);

  /**
   * One fact, told to the person this phone is currently being.
   *
   * `n.audience` maps a role to the words that role should hear, and a role
   * left out of it is a role that never learns this happened at all. A parent
   * is not told a location; a teacher is not told about another room; a student
   * is told nothing but what concerns them.
   *
   * If the fact belongs to a role this phone is not currently playing it waits
   * in that role's queue and arrives on entry, so switching to Parent still
   * shows what a parent's phone would have received while you were elsewhere.
   *
   * `key` is the fact itself and never the moment, so a confirmation cannot
   * announce itself twice however many times realtime redelivers the row. The
   * role is folded into the key, because the same event genuinely is two
   * different pieces of news to two different people.
   */
  const raise = useCallback((n) => {
    const audience = n.audience || {};
    Object.entries(audience).forEach(([who, line]) => {
      if (!line?.title) return;
      const item = { key: `${who}:${n.key}`, title: line.title, detail: line.detail || '' };
      if (who === roleRef.current) {
        notify(item.title, item.detail, item.key);
        return;
      }
      const q = pending.current[who] || (pending.current[who] = []);
      if (q.some((x) => x.key === item.key)) return;
      q.push(item);
      if (q.length > QUEUE_LIMIT) q.shift();
    });
  }, []);

  raiseRef.current = raise;

  useEffect(() => {
    prepareNotifications();
  }, []);

  // Becoming somebody delivers what happened to them while you were not.
  useEffect(() => {
    if (!role) return;
    const q = pending.current[role];
    if (!q?.length) return;
    pending.current[role] = [];
    q.forEach((item) => notify(item.title, item.detail, item.key));
  }, [role]);

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
              ? {
                  ...s,
                  status: row.status,
                  confirmedBy: row.confirmed_by,
                  confirmedAt: row.confirmed_at,
                  method: row.method || s.method,
                  place: row.place || s.place,
                }
              : s
          ),
        }))
      );

      // Realtime echoes this phone's own writes straight back to it. Without
      // this guard a teacher tapping "Mark whole room present" is told about
      // their own twenty-four taps, one buzz and one banner each, while the
      // student in front of them waits. A notification is for something that
      // happened somewhere else; what you just did with your thumb is not news.
      if (mine.current.has(row.id)) return;

      if (row.status === 'verified' || row.status === 'reunified') {
        buzz('tap');
        setRingingId(row.id);
        setTimeout(() => setRingingId(null), 1400);
        const released = row.status === 'reunified';
        const first = String(row.name || '').split(' ')[0];
        // What staff are told: who, by whom, where. This is the operational
        // line and it is the one a family must never receive.
        const staffLine = {
          title: released ? `${row.name} released to a guardian` : `${row.name} confirmed`,
          detail: [row.confirmed_by, row.place].filter(Boolean).join(' · ') || 'by a staff member',
        };
        // A teacher hears about their own room and nothing else.
        const onMyRoster = row.cluster && row.cluster === teacherRef.current?.room;
        // A family hears about their own child, without a location. The place
        // is deliberately dropped rather than reworded: during an active event
        // where a child is standing is exactly what must not travel.
        const isMyChild = row.id === MAYA.id;

        // Keyed on the student and what happened to them, deliberately without
        // a timestamp. Postgres stamps `updated_at` on every write and realtime
        // is free to redeliver a row, so a key carrying the moment would let
        // one confirmation buzz a pocket several times.
        raise({
          key: `${row.status}:${row.id}`,
          audience: {
            admin: staffLine,
            staff: staffLine,
            teacher: onMyRoster ? staffLine : null,
            parent: isMyChild
              ? {
                  title: released
                    ? `${first} has been released to you.`
                    : `${first} has been verified safe by school staff.`,
                  // Named, because a family being told which member of staff
                  // put their name to it is the whole accountability promise.
                  // Never the place: where a child is standing during an
                  // active event is the one thing that must not travel.
                  detail: released
                    ? 'Handed over at Gate B.'
                    : `Confirmed in person by ${row.confirmed_by || 'school staff'}.`,
                }
              : null,
          },
        });
      }
    });
  }, [live, raise]);

  // Tracking, shared across every phone. The student's device is the only one
  // that ever writes a position; every other phone only reads them.
  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    fetchTracking().then((rows) => {
      if (cancelled || !rows) return;
      setTracking(
        Object.fromEntries(
          rows.map((r) => [
            r.student_id,
            {
              state: r.state,
              askedBy: r.asked_by,
              askedAt: r.asked_at,
              answeredAt: r.answered_at,
              overriddenBy: r.overridden_by,
              overrideReason: r.override_reason,
              endedReason: r.ended_reason,
              expiresAt: r.expires_at,
            },
          ])
        )
      );
    });
    const off = subscribeToTracking({
      onState: (r) =>
        setTrack(r.student_id, {
          state: r.state,
          askedBy: r.asked_by,
          askedAt: r.asked_at,
          answeredAt: r.answered_at,
          overriddenBy: r.overridden_by,
          overrideReason: r.override_reason,
          endedReason: r.ended_reason,
          expiresAt: r.expires_at,
        }),
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [live, setTrack]);

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
  const teacher = useMemo(() => TEACHERS.find((t) => t.id === teacherId) || TEACHERS[0], [teacherId]);
  teacherRef.current = teacher;
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
      claim(studentId);
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
        // The one piece of news every single person in the building wants,
        // and the only one that carries no risk in reaching any of them.
        const closed = {
          title: 'Every student accounted for',
          detail: `${counts.verified + 1} confirmed by a person`,
        };
        raise({
          key: `allclear:${startedAt}`,
          audience: {
            admin: closed,
            staff: closed,
            teacher: closed,
            parent: {
              title: 'Every student has been accounted for.',
              detail: 'The school will tell you what happens next.',
            },
          },
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
    [setStatus, staffName, all, counts.verified, raise, startedAt, claim]
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
      claim(studentId);
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
      const releaseLine = {
        title: `${student?.name || 'A student'} released`,
        detail: `to ${guardianName || 'a guardian'} by ${releasedBy}`,
      };
      raiseRef.current?.({
        key: `reunified:${studentId}`,
        audience: {
          admin: releaseLine,
          staff: releaseLine,
          teacher: student?.cluster === teacherRef.current?.room ? releaseLine : null,
          // The family is standing at the gate watching it happen. Telling
          // their phone as well is noise, not news.
          parent: null,
        },
      });

      if (liveRef.current) {
        pushReunification({ studentId, guardianName, releasedBy, passCode });
      }
      return { ok: true };
    },
    [setStatus, staffName, all, claim]
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
    resetNotifications();
    mine.current.clear();
    setClusters(clone(CLUSTERS));
    setStartedAt(new Date().toISOString());
    setAllClear(false);
    setAnnouncement(null);
    setRingingId(null);
    setTracking({});
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
      const seenLine = {
        title: `${student?.name || 'A student'} last seen`,
        detail: `${where}, reported by ${author}`,
      };
      raiseRef.current?.({
        key: `lastseen:${studentId}:${at}`,
        audience: {
          admin: seenLine,
          staff: seenLine,
          teacher: seenLine,
          // A family must never learn from a push notification that nobody can
          // find their child. That news is a phone call from a person.
          parent: null,
        },
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
      // A new event is a new set of facts. Without this the second run-through
      // of a drill is silent, every alert dropped as a repeat of the first.
      resetNotifications();
      mine.current.clear();
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

      const openLine = {
        title: kind === 'drill' ? 'Drill started' : 'Lockdown started',
        detail: `by ${by}. Confirm your room.`,
      };
      raiseRef.current?.({
        key: `started:${startedAtNow}`,
        audience: {
          admin: openLine,
          staff: openLine,
          teacher: openLine,
          student: {
            title: kind === 'drill' ? 'Drill started' : 'Lockdown started',
            detail: 'Stay with your teacher. Have your code ready.',
          },
          parent: {
            title: kind === 'drill' ? 'A drill is underway' : 'The school is in lockdown',
            detail: 'Please do not come to campus. You will get an update here.',
          },
        },
      });

      // Every other phone learns from the thread, which they are all watching.
      if (liveRef.current) await sendMessage({ author: by, role: 'system', body: line });
      return { ok: true };
    },
    []
  );

  const startNewEvent = useCallback(() => {
    buzz('weighty');
    resetNotifications();
    mine.current.clear();
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

  // ── Locating a student nobody can find ─────────────────────────────────────
  //
  // The most invasive thing this product can do, so it is the most constrained.
  // Four rules, each enforced here rather than left to the interface:
  //
  //   1. It can only be asked for while a student is unaccounted for. The
  //      moment a person confirms them it stops, without anyone remembering.
  //   2. A request never becomes agreement on its own. There is no timer in
  //      this file that turns 'asked' into 'sharing', because silence from a
  //      frightened child is not a yes, and a student hiding from a threat may
  //      be silent on purpose.
  //   3. Proceeding without agreement is possible, because an unconscious
  //      child cannot answer — but only as a named person's written decision,
  //      stored under its own state so no report can later present it as
  //      consent.
  //   4. Everything expires. The clock is set when tracking starts, not when
  //      somebody thinks to stop it.

  const askToLocate = useCallback(
    async (studentId, byWho) => {
      const who = byWho || staffName;
      const student = all.find((s) => s.id === studentId);
      // Rule 1. Asking where somebody is, when a person is already standing
      // with them, is surveillance with no purpose left to serve.
      if (student?.status === 'verified' || student?.status === 'reunified') {
        return { ok: false, reason: `${student.name} has already been confirmed by a person.` };
      }
      const expiresAt = new Date(Date.now() + TRACK_MINUTES * 60000).toISOString();
      setTrack(studentId, {
        state: 'asked',
        askedBy: who,
        askedAt: new Date().toISOString(),
        answeredAt: null,
        overriddenBy: null,
        overrideReason: null,
        endedReason: null,
        expiresAt,
      });
      raiseRef.current?.({
        key: `locate-ask:${studentId}:${Date.now()}`,
        audience: {
          student: {
            title: 'The school is looking for you',
            detail: `${who} asked if you will share where you are. You can say no.`,
          },
          admin: { title: 'Location requested', detail: `${who} asked ${student?.name || 'a student'} to share where they are` },
          staff: { title: 'Location requested', detail: `${who} asked ${student?.name || 'a student'} to share where they are` },
        },
      });
      if (liveRef.current) await pushTrackingAsk({ studentId, askedBy: who, expiresAt });
      return { ok: true };
    },
    [staffName, all, setTrack]
  );

  /** The student's own answer. Refusing is a first class outcome, not a failure. */
  const answerLocate = useCallback(
    async (studentId, agreed) => {
      const student = all.find((s) => s.id === studentId);
      setTrack(studentId, {
        state: agreed ? 'sharing' : 'refused',
        answeredAt: new Date().toISOString(),
      });
      raiseRef.current?.({
        key: `locate-answer:${studentId}:${agreed}`,
        audience: {
          admin: {
            title: agreed ? `${student?.name || 'Student'} is sharing their location` : `${student?.name || 'Student'} declined`,
            detail: agreed ? 'their phone is reporting now' : 'nothing was sent, keep searching',
          },
          staff: {
            title: agreed ? `${student?.name || 'Student'} is sharing their location` : `${student?.name || 'Student'} declined`,
            detail: agreed ? 'their phone is reporting now' : 'nothing was sent, keep searching',
          },
        },
      });
      if (liveRef.current) await pushTrackingAnswer({ studentId, agreed });
      return { ok: true };
    },
    [all, setTrack]
  );

  /**
   * Rule 3. A named administrator proceeding without an answer.
   *
   * Both the name and the reason are required here and again by a database
   * constraint, and the student's own screen says plainly that it happened.
   * Nothing about this is quiet.
   */
  const overrideLocate = useCallback(
    async (studentId, by, reason) => {
      const who = (by || '').trim();
      const why = (reason || '').trim();
      if (!who || !why) return { ok: false, reason: 'An override needs a name and a reason.' };
      const student = all.find((s) => s.id === studentId);
      if (student?.status === 'verified' || student?.status === 'reunified') {
        return { ok: false, reason: `${student.name} has already been confirmed by a person.` };
      }
      const expiresAt = new Date(Date.now() + TRACK_MINUTES * 60000).toISOString();
      setTrack(studentId, { state: 'overridden', overriddenBy: who, overrideReason: why, expiresAt });
      raiseRef.current?.({
        key: `locate-override:${studentId}:${Date.now()}`,
        audience: {
          student: {
            title: 'The school turned on your location',
            detail: `${who} did this because you did not answer. You can still turn it off.`,
          },
          admin: { title: 'Location override', detail: `${who}: ${why}` },
          staff: { title: 'Location override', detail: `${who}: ${why}` },
        },
      });
      if (liveRef.current) await pushTrackingOverride({ studentId, by: who, reason: why, expiresAt });
      return { ok: true };
    },
    [all, setTrack]
  );

  /** Stop. Found, revoked by the student, event over, or expired. */
  const endLocate = useCallback(
    async (studentId, why = 'stopped') => {
      setTrack(studentId, { state: 'ended', endedReason: why });
      if (liveRef.current) await pushTrackingEnd({ studentId, reason: why });
      return { ok: true };
    },
    [setTrack]
  );

  /**
   * Rules 1 and 4, on a timer rather than trusted to a person.
   *
   * A student who has been found is no longer missing, and a permission that
   * outlives the emergency it was granted for is just surveillance. Both end
   * tracking without anybody having to remember — including the member of staff
   * who started it and has since moved on to the next room, which is the case
   * this is really written for.
   */
  useEffect(() => {
    const sweep = () => {
      const now = Date.now();
      Object.entries(tracking).forEach(([id, t]) => {
        if (!isLocating(t)) return;
        const student = all.find((s) => s.id === id);
        if (student?.status === 'verified' || student?.status === 'reunified') {
          endLocate(id, 'found by a person');
        } else if (!eventActive) {
          endLocate(id, 'the event ended');
        } else if (t.expiresAt && new Date(t.expiresAt).getTime() <= now) {
          endLocate(id, `expired after ${TRACK_MINUTES} minutes`);
        }
      });
    };
    sweep();
    const id = setInterval(sweep, 5000);
    return () => clearInterval(id);
  }, [tracking, all, eventActive, endLocate]);

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
      view,
      setView,
      role,
      confirmStudent,
      reunify,
      findStudents,
      resetSharedBoard,
      markNotWithClass,
      reportLastSeen,
      tracking,
      trackingFor: (id) => tracking[id] || null,
      askToLocate,
      answerLocate,
      overrideLocate,
      endLocate,
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
      teacher,
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
    [clusters, all, counts, mode, ringingId, dimField, allClear, announcement, view, role, teacher, raise, confirmStudent, reunify, findStudents, resetSharedBoard, markNotWithClass, reportLastSeen, undoConfirm, addOffRoster, setStatus, startNewEvent, startEvent, endEvent, eventActive, startedBy, teacherId, tracking, askToLocate, answerLocate, overrideLocate, endLocate, elapsed, startedAt, board, live, user, staffName, me, meId]
  );

  return <VerifiContext.Provider value={value}>{children}</VerifiContext.Provider>;
}

export function useVerifi() {
  const ctx = useContext(VerifiContext);
  if (!ctx) throw new Error('useVerifi must be used inside VerifiProvider');
  return ctx;
}

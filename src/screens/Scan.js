import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Glass, Rule, StatusDot } from '../components/ui';
import Explain from '../components/Explain';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { codeFor, guardianCodeFor, guardiansFor, spaced } from '../data';
import { fromRow, useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { useReducedMotion } from '../motion';
import { fetchGuardians, studentByCode } from '../supabase';

/**
 * Establishing that this is the right child.
 *
 * The camera is the fast path and it is not the only one. During a real event a
 * large minority of students cannot show a code: a flat battery, a phone in a
 * locker, a phone taken off them that morning, a ninth grader who does not own
 * one. Those are the ordinary cases, so this screen offers three ways in and
 * treats none of them as a failure state:
 *
 *   Camera    read the rotating code off the student's screen
 *   By code   they have no phone and recite the fixed code they know by heart
 *   By name   search the board, find them, then ask them for that code
 *
 * And when even the code is gone, a staff member can still vouch on their word
 * alone. That path is deliberately three taps deep and says out loud what it is,
 * because it is the weakest link in the chain and burying it would be dishonest
 * while removing it would leave a real child uncounted.
 */

const WAYS = [
  { id: 'camera', label: 'Camera', icon: 'scan' },
  { id: 'code', label: 'By code', icon: 'lock' },
  { id: 'name', label: 'By name', icon: 'badge' },
];

const METHOD_LINE = {
  qr: 'Code read from their phone',
  recited: 'Code recited from memory',
  vouched: 'Vouched for by a staff member, no code',
  roster: 'Ticked off a room roster',
  guardian: 'Released to a guardian',
};

function Bracket({ corner, color = '#FFFFFF' }) {
  const base = { position: 'absolute', width: 30, height: 30, borderColor: color };
  const map = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  };
  return <View style={[base, map[corner]]} />;
}

/** Six boxes, one per digit, so a code is read back the way it is spoken. */
function CodeInput({ value, onChange, onSubmit, autoFocus, tone = C.accent, inputRef }) {
  const own = useRef(null);
  const ref = inputRef || own;
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityRole="none">
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: i === value.length ? tone : C.rule,
              backgroundColor: 'rgba(255,255,255,0.8)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: F.monoSemi, fontSize: 22, color: C.ink }}>{d.trim()}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        maxLength={6}
        accessibilityLabel="Six digit code"
        style={{ position: 'absolute', width: '100%', height: 56, opacity: 0 }}
      />
    </Pressable>
  );
}

function Segmented({ value, onChange }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginTop: S.md,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
        padding: 4,
        gap: 4,
      }}
    >
      {WAYS.map((w) => {
        const active = value === w.id;
        return (
          <Pressable
            key={w.id}
            onPress={() => onChange(w.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: 46,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: active ? C.accent : 'transparent',
            }}
          >
            <Icon name={w.icon} size={16} color={active ? '#FFFFFF' : C.inkSoft} />
            <Text
              style={{ fontFamily: F.uiSemi, fontSize: 13, color: active ? '#FFFFFF' : C.inkSoft }}
            >
              {w.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Scan({ navigate }) {
  const { confirmStudent, reunify, findStudents, staffName, all, maya, eventActive } = useVerifi();
  const [permission, requestPermission] = useCameraPermissions();
  const { place, coords, status: locStatus, start: askLocation } = useLiveLocation({ active: eventActive });

  const [way, setWay] = useState('camera');
  // { student, method, code } — the person the screen is now about.
  const [hit, setHit] = useState(null);
  // { student, guardians, passCode } — a guardian at the gate, not a student.
  const [gate, setGate] = useState(null);
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState(null);

  // By code
  const [typed, setTyped] = useState('');
  const [looking, setLooking] = useState(false);

  // By name
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // The student picked from the results, now being asked for their code.
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [vouching, setVouching] = useState(false);

  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const lock = useRef(false);
  // A wrong code clears the boxes. Without this the keyboard also goes away and
  // the staff member has to tap the field again to try the second time, which
  // is a thing nobody has patience for with a student standing in front of them.
  const answerRef = useRef(null);

  useEffect(() => {
    if (reduced || hit || gate || way !== 'camera') return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, reduced, hit, gate, way]);

  const reset = useCallback(() => {
    lock.current = false;
    setHit(null);
    setGate(null);
    setArmed(false);
    setNote(null);
    setTyped('');
    setQuery('');
    setResults([]);
    setChallenge(null);
    setAnswer('');
    setAttempts(0);
    setVouching(false);
  }, []);

  const land = (student, method, code) => {
    lock.current = true;
    setNote(null);
    setHit({ student, method, code });
    setArmed(false);
    setChallenge(null);
    setAnswer('');
  };

  /** The code a student holds, whichever source we have for it. */
  const codeOf = (s) => s?.code || codeFor(s.id);
  const guardianCodeOf = (s) => s?.guardianCode || guardianCodeFor(s.id);

  // ── A guardian at the gate ────────────────────────────────────────────────
  const openGate = useCallback(
    async (student, passCode) => {
      lock.current = true;
      const remote = await fetchGuardians(student.id);
      const list = remote?.length ? remote : guardiansFor(student.id);
      setGate({ student, passCode, guardians: list });
      setNote(null);
    },
    []
  );

  // ── Camera ────────────────────────────────────────────────────────────────
  const take = (raw) => {
    const text = (raw || '').trim();

    const guardian = /^VERIFI-GUARDIAN:([\w-]+):(\d{6})$/.exec(text);
    if (guardian) {
      const student = all.find((s) => s.id === guardian[1]);
      if (!student) {
        setNote('That pass is for a student who is not on this board.');
        return true;
      }
      if (guardian[2] !== guardianCodeOf(student)) {
        setNote(`That pass does not match ${student.name.split(' ')[0]}. Do not release the student.`);
        return true;
      }
      openGate(student, guardian[2]);
      return true;
    }

    const m = /^VERIFI:([\w-]+):(\d{6})$/.exec(text);
    if (!m) {
      if (text) setNote('That is not a Verifi code. Try By name instead.');
      return false;
    }
    const student = all.find((s) => s.id === m[1]);
    if (!student) {
      setNote('That code is for a student who is not on this board.');
      return true;
    }
    land(student, 'qr', m[2]);
    return true;
  };

  const onScan = ({ data }) => {
    if (lock.current) return;
    take(data);
  };

  // ── By code: they recite, you type ────────────────────────────────────────
  const byCode = async () => {
    if (typed.length !== 6 || looking) return;
    setLooking(true);
    setNote(null);

    const local = all.find((s) => codeOf(s) === typed);
    if (local) {
      setLooking(false);
      land(local, 'recited', typed);
      return;
    }

    // Not in this phone's copy of the roster. Ask the board. The row comes back
    // in the database's shape, so it is translated before anything renders it.
    const row = await studentByCode(typed);
    setLooking(false);
    if (row) {
      land(all.find((s) => s.id === row.id) || fromRow(row), 'recited', typed);
      return;
    }
    setNote(`No student on this board has the code ${spaced(typed)}. Check the digits, or find them by name.`);
  };

  // ── By name: search the board, then ask for the code ──────────────────────
  useEffect(() => {
    if (way !== 'name') return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    // A staff member types while a student is standing there, so the query
    // waits for the hand to stop rather than firing on every keystroke.
    const t = setTimeout(async () => {
      const rows = await findStudents(q);
      if (cancelled) return;
      setResults(rows);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, way, findStudents]);

  const answerCode = () => {
    if (!challenge || answer.length !== 6) return;
    if (answer === codeOf(challenge)) {
      land(challenge, 'recited', answer);
      return;
    }
    const n = attempts + 1;
    setAttempts(n);
    setAnswer('');
    setNote(
      n >= 3
        ? `Three wrong codes. Either this is not ${challenge.name.split(' ')[0]}, or they have forgotten it. Both happen.`
        : 'That is not their code. Ask them to say it again, slowly.'
    );
    // Straight back into the field, ready for the second attempt.
    setTimeout(() => answerRef.current?.focus(), 0);
    // Three wrong codes is the point at which a person needs the other door
    // shown to them rather than left for them to find.
    if (n >= 3) setVouching(true);
  };

  const live = hit ? all.find((s) => s.id === hit.student.id) || hit.student : null;
  const alreadyDone = live?.status === 'verified' || live?.status === 'reunified';
  const noCamera = Platform.OS === 'web';

  /**
   * Why the last thing failed, rendered next to the thing that failed.
   *
   * This used to live at the bottom of the screen, which meant a staff member
   * who typed a wrong code saw the boxes clear and nothing else, with the
   * explanation sitting below the fold under two other buttons. The message has
   * to be where the eye already is.
   */
  const noteBlock = note ? (
    <View
      style={{
        backgroundColor: 'rgba(185,133,36,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(185,133,36,0.24)',
        borderRadius: R.small,
        padding: S.md,
      }}
    >
      <Text style={[T.small, { color: C.ink }]}>{note}</Text>
    </View>
  ) : null;

  // ── The result card, shared by all three ways in ──────────────────────────
  const resultCard = hit ? (
    <View style={[cardStyle, { marginTop: S.lg, padding: S.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Avatar
          name={hit.student.name}
          seed={hit.student.id}
          size={52}
          ring={alreadyDone ? C.verified : C.pending}
        />
        <View style={{ flex: 1 }}>
          <Text style={T.heading}>{hit.student.name}</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
            {hit.student.id} · {hit.student.cluster}
            {hit.student.grade ? ` · grade ${hit.student.grade}` : ''}
          </Text>
        </View>
        {alreadyDone ? <Check size={18} /> : <StatusDot status="pending" size={10} />}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.sm,
          marginTop: S.md,
          paddingVertical: 7,
          paddingHorizontal: 10,
          borderRadius: 999,
          alignSelf: 'flex-start',
          backgroundColor: hit.method === 'vouched' ? 'rgba(185,133,36,0.1)' : 'rgba(18,79,76,0.07)',
        }}
      >
        <Text
          style={{
            fontFamily: F.monoMed,
            fontSize: 10,
            letterSpacing: 0.4,
            color: hit.method === 'vouched' ? C.pending : C.accent,
          }}
        >
          {METHOD_LINE[hit.method].toUpperCase()}
          {hit.code ? ` · ${spaced(hit.code)}` : ''}
        </Text>
      </View>

      <Rule style={{ marginVertical: S.md }} />

      {alreadyDone ? (
        <>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 24, color: C.ink }}>
            {hit.student.name} is already confirmed by {live?.confirmedBy || 'a staff member'}
            {live?.place ? ` at ${live.place}` : ''}.
          </Text>
          <Text style={[T.small, { marginTop: S.xs }]}>
            Nothing to do. Confirming twice does not make it more true.
          </Text>
          <Button title="Confirm someone else" variant="secondary" style={{ marginTop: S.md }} onPress={reset} />
          <Button title="See the board" variant="quiet" style={{ marginTop: S.xs }} onPress={() => navigate('admin')} />
        </>
      ) : (
        <>
          <Text style={T.small}>
            {hit.method === 'vouched'
              ? 'No code was checked. You are putting your name to this on sight alone, and the board will say so.'
              : 'Check the face against the person in front of you. The code alone changes nothing.'}
          </Text>
          {place ? (
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: S.sm }}>
              will be recorded at {place}
            </Text>
          ) : null}
          <Button
            title={armed ? `Yes, I can see ${hit.student.name.split(' ')[0]}` : 'Confirm this student'}
            variant={armed ? 'verified' : 'primary'}
            style={{ marginTop: S.md }}
            onPress={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              confirmStudent(hit.student.id, { code: hit.code, place, method: hit.method });
              navigate(hit.student.id === maya?.id ? 'allclear' : 'admin');
            }}
          />
          <Button title="Not this student" variant="quiet" style={{ marginTop: S.xs }} onPress={reset} />
        </>
      )}
    </View>
  ) : null;

  // ── A guardian at the gate ────────────────────────────────────────────────
  const gateCard = gate ? (
    <View style={[cardStyle, { marginTop: S.lg, padding: S.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Icon name="family" size={26} />
        <View style={{ flex: 1 }}>
          <Text style={T.heading}>Guardian pass</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
            {spaced(gate.passCode)} · matches {gate.student.name}
          </Text>
        </View>
        <Check size={18} />
      </View>

      <Rule style={{ marginVertical: S.md }} />

      <Text style={T.small}>
        The pass is valid. It says which student, not which adult. Check photo ID against this list and tap
        the person actually standing at the gate.
      </Text>

      <View style={{ gap: S.sm, marginTop: S.md }}>
        {gate.guardians.length === 0 ? (
          <Text style={[T.small, { color: C.pending }]}>
            Nobody is on this student's authorised list. Do not release them. Send for an administrator.
          </Text>
        ) : (
          gate.guardians.map((g) => (
            <Pressable
              key={g.id || g.name}
              accessibilityRole="button"
              onPress={() => {
                reunify(gate.student.id, {
                  guardianName: g.name,
                  by: staffName,
                  passCode: gate.passCode,
                });
                setGate(null);
                navigate('admin');
              }}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                paddingHorizontal: S.lg,
                borderRadius: R.card,
                borderWidth: 1,
                borderColor: C.rule,
                backgroundColor: 'rgba(255,255,255,0.85)',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Avatar name={g.name} seed={g.name} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{g.name}</Text>
                <Text style={[T.small, { marginTop: 1 }]}>
                  {g.relation} · {g.phone}
                </Text>
              </View>
              <Text style={{ fontFamily: F.uiSemi, fontSize: 12, color: C.accent }}>Release</Text>
            </Pressable>
          ))
        )}
      </View>

      <Button title="Neither of these" variant="quiet" style={{ marginTop: S.md }} onPress={reset} />
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: S.xl, paddingBottom: 96 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={T.title}>Confirm a student</Text>
            <Text style={[T.small, { marginTop: S.xs }]}>{staffName}</Text>
          </View>
          <Pressable
            onPress={locStatus === 'on' ? undefined : askLocation}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: locStatus === 'on' ? C.verified : C.rule,
              backgroundColor: locStatus === 'on' ? 'rgba(47,125,104,0.08)' : 'rgba(255,255,255,0.8)',
            }}
          >
            <Text
              style={{
                fontFamily: F.monoMed,
                fontSize: 10,
                letterSpacing: 0.4,
                color: locStatus === 'on' ? C.verified : C.inkSoft,
              }}
            >
              {locStatus === 'on' ? place || 'LOCATING' : 'ENABLE LOCATION'}
            </Text>
          </Pressable>
        </View>
        <Explain route="scan" />

        {/* Once somebody is on screen, the way you found them stops mattering. */}
        {!hit && !gate ? (
          <Segmented
            value={way}
            onChange={(v) => {
              setWay(v);
              setNote(null);
              setChallenge(null);
              setAnswer('');
              setAttempts(0);
              setVouching(false);
            }}
          />
        ) : null}

        {/* ── Camera ─────────────────────────────────────────────────────── */}
        {way === 'camera' && !hit && !gate ? (
          <View
            style={{
              marginTop: S.md,
              height: 290,
              borderRadius: 18,
              overflow: 'hidden',
              backgroundColor: '#E7EAE9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {permission?.granted && !noCamera ? (
              <>
                <CameraView
                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={onScan}
                />
                <View style={{ width: 190, height: 190 }}>
                  <Bracket corner="tl" />
                  <Bracket corner="tr" />
                  <Bracket corner="bl" />
                  <Bracket corner="br" />
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 6,
                      right: 6,
                      height: 2,
                      backgroundColor: '#FFFFFF',
                      opacity: 0.8,
                      transform: [
                        { translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [8, 180] }) },
                      ],
                    }}
                  />
                </View>
              </>
            ) : (
              <View style={{ padding: S.xl, alignItems: 'center' }}>
                <Text style={[T.body, { textAlign: 'center' }]}>
                  {noCamera
                    ? 'A browser tab has no camera. Use By code or By name, which need none.'
                    : 'Verifi needs the camera to read a student code.'}
                </Text>
                {!noCamera ? (
                  <Button title="Allow camera" style={{ marginTop: S.lg }} onPress={requestPermission} />
                ) : (
                  <Button
                    title="Find them by name"
                    variant="secondary"
                    style={{ marginTop: S.lg }}
                    onPress={() => setWay('name')}
                  />
                )}
              </View>
            )}
          </View>
        ) : null}

        {way === 'camera' && !hit && !gate ? (
          <Text style={[T.small, { marginTop: S.md }]}>
            Reads a student's rotating code, and a guardian's pickup pass at the gate. It scans by itself;
            there is no button.
          </Text>
        ) : null}

        {/* ── By code ────────────────────────────────────────────────────── */}
        {way === 'code' && !hit && !gate ? (
          <Glass intensity={26} style={{ marginTop: S.md, borderRadius: R.card, padding: S.lg, gap: S.md }}>
            <Text style={T.label}>They have no phone</Text>
            <Text style={T.small}>
              Every student knows one fixed six-digit code, the way they know a locker combination. Ask them
              to say it out loud and type it here. It does not expire and it does not need a battery.
            </Text>
            <CodeInput
              value={typed}
              onChange={(v) => {
                setTyped(v);
                setNote(null);
              }}
              onSubmit={byCode}
              autoFocus
            />
            {noteBlock}
            <Button
              title={looking ? 'Looking' : 'Find this student'}
              onPress={byCode}
              disabled={typed.length !== 6 || looking}
            />
            <Pressable
              onPress={() => setWay('name')}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>
                They cannot remember it. Search by name instead
              </Text>
            </Pressable>
          </Glass>
        ) : null}

        {/* ── By name ────────────────────────────────────────────────────── */}
        {way === 'name' && !hit && !gate ? (
          <View style={{ marginTop: S.md }}>
            {!challenge ? (
              <Glass intensity={26} style={{ borderRadius: R.card, padding: S.lg, gap: S.md }}>
                <Text style={T.label}>Search the board</Text>
                <Text style={T.small}>
                  Type what you heard. This searches every student on the shared board, not just the ones
                  this phone has loaded.
                </Text>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Student name"
                  placeholderTextColor={C.absent}
                  autoCorrect={false}
                  autoFocus
                  style={{
                    minHeight: 56,
                    borderWidth: 1,
                    borderColor: C.rule,
                    borderRadius: R.card,
                    paddingHorizontal: S.lg,
                    fontFamily: F.ui,
                    fontSize: 16,
                    color: C.ink,
                    backgroundColor: 'rgba(255,255,255,0.85)',
                  }}
                />

                {searching ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                    <ActivityIndicator size="small" color={C.accent} />
                    <Text style={T.small}>Searching the board</Text>
                  </View>
                ) : null}

                {!searching && query.trim().length >= 2 && results.length === 0 ? (
                  <Text style={[T.small, { color: C.pending }]}>
                    Nobody on this board matches “{query.trim()}”. Try a surname, or fewer letters.
                  </Text>
                ) : null}

                <View style={{ gap: S.sm }}>
                  {results.map((s) => {
                    const done = s.status === 'verified' || s.status === 'reunified';
                    return (
                      <Pressable
                        key={s.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setChallenge(s);
                          setAnswer('');
                          setAttempts(0);
                          setNote(null);
                        }}
                        style={({ pressed }) => ({
                          minHeight: 64,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: S.md,
                          paddingHorizontal: S.md,
                          borderRadius: R.card,
                          borderWidth: 1,
                          borderColor: C.rule,
                          backgroundColor: 'rgba(255,255,255,0.85)',
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Avatar name={s.name} seed={s.id} size={38} ring={done ? C.verified : undefined} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{s.name}</Text>
                          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                            {s.id} · {s.cluster}
                          </Text>
                        </View>
                        {done ? <Check size={16} /> : <StatusDot status={s.status} size={9} />}
                      </Pressable>
                    );
                  })}
                </View>
              </Glass>
            ) : (
              /* Found them on the board. Now prove it is them. */
              <Glass intensity={26} style={{ borderRadius: R.card, padding: S.lg, gap: S.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar name={challenge.name} seed={challenge.id} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.heading}>{challenge.name}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                      {challenge.id} · {challenge.cluster}
                    </Text>
                  </View>
                </View>

                <Text style={T.small}>
                  A name on a screen is not proof. Ask {challenge.name.split(' ')[0]} for their six-digit
                  code before you type anything, and do not read it out to them.
                </Text>

                <CodeInput
                  inputRef={answerRef}
                  value={answer}
                  onChange={(v) => {
                    setAnswer(v);
                    setNote(null);
                  }}
                  onSubmit={answerCode}
                  autoFocus
                  tone={attempts > 0 ? C.pending : C.accent}
                />

                {noteBlock}

                <Button
                  title="Check the code"
                  onPress={answerCode}
                  disabled={answer.length !== 6}
                />

                {/* The last resort. Three taps deep, and it says what it is. */}
                {vouching ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: 'rgba(185,133,36,0.35)',
                      backgroundColor: 'rgba(185,133,36,0.08)',
                      borderRadius: R.small,
                      padding: S.md,
                      gap: S.sm,
                    }}
                  >
                    <Text style={[T.label, { fontSize: 10, color: C.pending }]}>Without a code</Text>
                    <Text style={T.small}>
                      A student who cannot show a code and cannot remember one still has to be counted, and
                      leaving them off the board is the worse mistake. You can confirm{' '}
                      {challenge.name.split(' ')[0]} on your word alone. It is recorded as exactly that, with
                      your name on it, and it is the weakest kind of confirmation this app holds.
                    </Text>
                    <Button
                      title={`Confirm ${challenge.name.split(' ')[0]} without a code`}
                      variant="secondary"
                      onPress={() => land(challenge, 'vouched', null)}
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setVouching(true)}
                    accessibilityRole="button"
                    style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>
                      They cannot remember their code
                    </Text>
                  </Pressable>
                )}

                <Button
                  title="Someone else"
                  variant="quiet"
                  onPress={() => {
                    setChallenge(null);
                    setAnswer('');
                    setAttempts(0);
                    setVouching(false);
                    setNote(null);
                  }}
                />
              </Glass>
            )}
          </View>
        ) : null}

        {/* The code paths render this next to their own input. What is left is
            the camera, where the whole viewfinder is the thing that failed. */}
        {way === 'camera' && !hit && !gate ? <View style={{ marginTop: S.md }}>{noteBlock}</View> : null}

        {gateCard}
        {resultCard}

        {coords && !hit && !gate ? (
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: S.lg }}>
            {coords}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

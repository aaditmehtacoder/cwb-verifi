import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Chip, Glass, Rule, Sheet, StatusDot } from '../components/ui';
import Explain from '../components/Explain';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Where from '../components/Where';
import Locate from '../components/Locate';
import { OFF_ROSTER } from '../data';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';

const FILTERS = [
  { id: 'action', label: 'Needs action' },
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
];

// Where a teacher might last have seen a student. Four answers, because a
// teacher with thirty children to count will not write a sentence, and an
// approximate answer given in one tap beats an exact one never given.
const LAST_SEEN = ['In this room', 'In the hallway', 'Left for the nurse', 'I do not know'];

const METHOD_LINE = {
  qr: 'code read from their phone',
  recited: 'code recited from memory',
  vouched: 'no code, a staff member vouched',
  roster: 'ticked off a room roster',
  guardian: 'released to a guardian',
};

const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

function RowAction({ title, tone, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: 84,
        minHeight: 56,
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: tone === 'primary' ? C.accent : C.rule,
        backgroundColor: tone === 'primary' ? C.accent : 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: S.sm,
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: F.uiSemi,
          fontSize: 13,
          color: tone === 'primary' ? '#FFFFFF' : C.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/**
 * What the board knows about a student the teacher cannot account for.
 *
 * This is the whole point of the screen. Before, "Not here" was a dead end: the
 * teacher told the app something and got nothing back, at the exact moment they
 * most needed an answer. The app already held the answer — somebody else may
 * have laid eyes on this child a minute ago — it simply never said so.
 */
function Answer({ student, onLastSeen, onDismiss }) {
  const held = student.status === 'verified' || student.status === 'reunified';

  if (held) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: 'rgba(47,125,104,0.3)',
          backgroundColor: 'rgba(47,125,104,0.07)',
          borderRadius: R.small,
          padding: S.md,
          gap: S.xs,
          marginBottom: S.md,
        }}
      >
        {/* Serif: a person vouched for this. */}
        <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 24, color: C.ink }}>
          {student.name.split(' ')[0]} is already accounted for.
        </Text>
        <Text style={[T.small, { color: C.ink }]}>
          {student.place || student.cluster} — {student.confirmedBy || 'a staff member'} confirmed them
          {student.confirmedAt ? ` at ${clock(student.confirmedAt)}` : ''}.
        </Text>
        <Text style={[T.small, { fontSize: 12 }]}>
          Nothing more for you to do. Their status is untouched by this.
        </Text>
        <Pressable onPress={onDismiss} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>Got it</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: 'rgba(185,133,36,0.35)',
        backgroundColor: 'rgba(185,133,36,0.08)',
        borderRadius: R.small,
        padding: S.md,
        gap: S.sm,
        marginBottom: S.md,
      }}
    >
      <Text style={[T.label, { fontSize: 10, color: C.pending }]}>Nobody has {student.name.split(' ')[0]}</Text>
      <Text style={[T.small, { color: C.ink }]}>
        Flagged to the board just now, so somebody goes looking. When did you last see them?
      </Text>
      {student.lastSeen ? (
        <Text style={{ fontFamily: F.uiMed, fontSize: 14, color: C.ink }}>
          Reported: {student.lastSeen}.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {LAST_SEEN.map((w) => (
            <Chip key={w} label={w} tone="pending" onPress={() => onLastSeen(w)} />
          ))}
        </View>
      )}
      <Pressable onPress={onDismiss} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>Close</Text>
      </Pressable>
    </View>
  );
}

function StudentRow({ student, onConfirm, onNotHere, onUndo, onOpen }) {
  const confirmed = student.status === 'verified' || student.status === 'reunified';

  if (confirmed) {
    return (
      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md }}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${student.name}, details`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 }}
        >
          <Avatar name={student.name} seed={student.id} size={38} ring={C.verified} />
          <View style={{ flex: 1 }}>
            {/* Serif means a person vouched for this. */}
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.ink }}>{student.name}</Text>
            <Text style={{ fontFamily: F.ui, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
              {student.confirmedBy || 'Confirmed'}
              {student.place ? ` at ${student.place}` : ''}
            </Text>
          </View>
        </Pressable>
        <Check />
        <Pressable
          onPress={onUndo}
          hitSlop={12}
          accessibilityRole="button"
          style={{ minHeight: 56, justifyContent: 'center', paddingLeft: S.sm }}
        >
          <Text style={{ fontFamily: F.uiMed, fontSize: 12, color: C.accent }}>Undo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.md }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${student.name}, details`}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md }}
      >
        <Avatar name={student.name} seed={student.id} size={38} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>
            {student.name}
          </Text>
          {student.lastSeen ? (
            <Text style={{ fontFamily: F.ui, fontSize: 12, color: C.pending, marginTop: 2 }}>
              last seen {student.lastSeen.toLowerCase()}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <RowAction title="With me" tone="primary" onPress={onConfirm} />
      <RowAction title="Not here" onPress={onNotHere} />
    </View>
  );
}

export default function Teacher({ navigate }) {
  const {
    clusters,
    elapsed,
    confirmStudent,
    markNotWithClass,
    reportLastSeen,
    undoConfirm,
    addOffRoster,
    teachers,
    teacherId,
    setTeacherId,
    teacher,
    eventActive,
    live,
    board,
  } = useVerifi();
  const { place, coords, status: locStatus, start: askLocation } = useLiveLocation({ active: eventActive });

  const [filter, setFilter] = useState('action');
  const [confirmAll, setConfirmAll] = useState(false);
  const [boardSheet, setBoardSheet] = useState(false);
  const [roomSheet, setRoomSheet] = useState(false);
  const [detail, setDetail] = useState(null);
  // Which student the teacher just said is not with them, and what the board
  // had to say about it.
  const [answered, setAnswered] = useState(null);

  // The room is whichever one this teacher holds — not a constant. The store
  // has carried `teacherId` all along; this screen used to ignore it entirely
  // and show the Chemistry roster to everybody.
  const room = clusters.find((c) => c.name === teacher.room) || clusters[0];
  const roster = room.students;
  const done = roster.filter((s) => s.status === 'verified' || s.status === 'reunified').length;
  const hasDevin = roster.some((s) => s.id === OFF_ROSTER.id);

  const visible = useMemo(() => {
    if (filter === 'action') return roster.filter((s) => s.status !== 'verified' && s.status !== 'reunified');
    if (filter === 'confirmed') return roster.filter((s) => s.status === 'verified' || s.status === 'reunified');
    return roster;
  }, [roster, filter]);

  // The answer block reads from the live roster, so a confirmation landing from
  // another phone while it is open changes what it says.
  const answeredStudent = answered ? roster.find((s) => s.id === answered) : null;

  const notHere = (student) => {
    const r = markNotWithClass(student.id);
    setAnswered(student.id);
    return r;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={T.title}>{room.name}</Text>
              {/* Who the app thinks you are. It used to print the signed-in
                  name beside a room that belonged to somebody else. */}
              <Pressable
                onPress={() => setRoomSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={`You are ${teacher.name}. Change room.`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: S.sm,
                  alignSelf: 'flex-start',
                  marginTop: S.xs,
                  paddingLeft: 10,
                  paddingRight: 8,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: C.rule,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  maxWidth: '100%',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text numberOfLines={1} style={[T.small, { color: C.ink, flexShrink: 1 }]}>
                  {teacher.name}
                </Text>
                <Text style={{ fontFamily: F.uiSemi, fontSize: 11, color: C.accent }}>Change</Text>
              </Pressable>
              <Text style={{ fontFamily: F.mono, fontSize: 13, color: C.inkSoft, marginTop: S.sm }}>
                Elapsed {elapsed}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 32, color: C.ink }}>{done}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 18, color: C.inkSoft }}> / {roster.length}</Text>
              </View>
              <Text style={[T.label, { marginTop: 2 }]}>Confirmed</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.lg, flexWrap: 'wrap' }}>
            {/* The real state of the shared board. This chip used to be the
                hardcoded string "OFFLINE, 3 QUEUED", which cheerfully claimed
                the network was down while the count was visibly syncing. */}
            <Pressable
              onPress={() => setBoardSheet(true)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: live ? C.verified : C.pending,
                backgroundColor: live ? 'rgba(47,125,104,0.08)' : 'rgba(185,133,36,0.08)',
              }}
            >
              <Text
                style={{
                  fontFamily: F.monoMed,
                  fontSize: 11,
                  color: live ? C.verified : C.pending,
                  letterSpacing: 0.4,
                }}
              >
                {live ? 'SHARED BOARD' : 'THIS PHONE ONLY'}
              </Text>
            </Pressable>

            {/* Where this phone is, so a confirmation can carry a place. */}
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
                  fontSize: 11,
                  color: locStatus === 'on' ? C.verified : C.inkSoft,
                  letterSpacing: 0.4,
                }}
              >
                {locStatus === 'on'
                  ? place || 'LOCATING'
                  : locStatus === 'denied'
                  ? 'LOCATION OFF'
                  : 'ENABLE LOCATION'}
              </Text>
            </Pressable>
          </View>
        </View>
        <Explain route="teacher" />

        {/* Sticky bar, frosted so the roster stays faintly visible beneath it */}
        <Glass
          tone="solid"
          intensity={60}
          style={{
            marginHorizontal: -S.xl,
            paddingHorizontal: S.xl,
            paddingTop: S.md,
            paddingBottom: S.md,
            marginBottom: S.md,
            borderRadius: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            borderTopWidth: 0,
          }}
        >
          <Button
            title={confirmAll ? `Tap again to confirm all ${roster.length}` : 'Mark whole room present'}
            variant={confirmAll ? 'verified' : 'secondary'}
            subtitle={confirmAll ? 'You vouch for the whole room' : undefined}
            onPress={() => {
              if (!confirmAll) {
                setConfirmAll(true);
                return;
              }
              roster.forEach((s) => {
                if (s.status !== 'verified' && s.status !== 'reunified') {
                  confirmStudent(s.id, { place, by: teacher.short, method: 'roster' });
                }
              });
              setConfirmAll(false);
            }}
          />
          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
            ))}
          </View>
        </Glass>

        {/* What the board knew, the moment the teacher said "not here". */}
        {answeredStudent ? (
          <Answer
            student={answeredStudent}
            onLastSeen={(w) => reportLastSeen(answeredStudent.id, w, teacher.short)}
            onDismiss={() => setAnswered(null)}
          />
        ) : null}

        <View style={[cardStyle, { paddingHorizontal: S.lg, paddingVertical: S.xs }]}>
          {visible.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Rule /> : null}
              <StudentRow
                student={s}
                onOpen={() => setDetail(s)}
                onConfirm={() => confirmStudent(s.id, { place, by: teacher.short, method: 'roster' })}
                onNotHere={() => notHere(s)}
                onUndo={() => undoConfirm(s.id)}
              />
            </View>
          ))}
          {visible.length === 0 ? (
            <View style={{ paddingVertical: S.xl, alignItems: 'center' }}>
              <Text
                style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 25, color: C.ink, textAlign: 'center' }}
              >
                {filter === 'action' ? 'Everyone in this room is confirmed.' : 'Nothing in this filter.'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* A student standing in a room that is not theirs. */}
        {!hasDevin ? (
          <View style={{ marginTop: S.xl }}>
            <Text style={T.label}>Not on your roster</Text>
            <View style={[cardStyle, { marginTop: S.sm, padding: S.lg, gap: S.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <StatusDot status="pending" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{OFF_ROSTER.name}</Text>
                  <Text style={[T.small, { marginTop: 2 }]}>Assigned to Gym. Standing in your room.</Text>
                </View>
              </View>
              <Button title="Add student I have with me" onPress={() => addOffRoster(room.name)} />
            </View>
          </View>
        ) : null}

        <Button
          title="Open the board"
          variant="quiet"
          style={{ marginTop: S.xl }}
          onPress={() => navigate('admin')}
        />
      </ScrollView>

      {/* ── Which room is yours ───────────────────────────────────────────── */}
      <Sheet visible={roomSheet} onClose={() => setRoomSheet(false)} title="Which room is yours?" maxHeight="72%">
        <Text style={[T.small, { marginBottom: S.md }]}>
          You only ever see this roster, and every student you confirm is recorded under this name.
        </Text>
        <View style={{ gap: S.sm }}>
          {teachers.map((t) => {
            const mine = t.id === teacherId;
            const size = clusters.find((c) => c.name === t.room)?.students.length;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: mine }}
                onPress={() => {
                  setTeacherId(t.id);
                  setAnswered(null);
                  setFilter('action');
                  setRoomSheet(false);
                }}
                style={{
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: S.md,
                  paddingHorizontal: S.lg,
                  borderRadius: R.card,
                  borderWidth: 1,
                  borderColor: mine ? C.accent : C.rule,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                }}
              >
                <Avatar name={t.name} seed={t.id} size={38} ring={mine ? C.accent : undefined} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{t.name}</Text>
                  <Text style={[T.small, { marginTop: 1 }]}>{t.subject}</Text>
                </View>
                <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>
                  {size != null ? `${size}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* ── One student, only what changes what you do next ───────────────── */}
      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.name} maxHeight="76%">
        {detail ? (
          (() => {
            // Read from the live roster so this reflects a confirmation that
            // landed from another phone while the sheet was open.
            const s = roster.find((x) => x.id === detail.id) || detail;
            const held = s.status === 'verified' || s.status === 'reunified';
            return (
              <View style={{ gap: S.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar name={s.name} seed={s.id} size={52} ring={held ? C.verified : C.pending} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.heading}>{s.name}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                      {s.id} · {s.cluster}
                      {s.grade ? ` · grade ${s.grade}` : ''}
                    </Text>
                  </View>
                  <StatusDot status={s.status} size={10} />
                </View>

                {held ? (
                  <>
                    <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 24, color: C.ink }}>
                      {s.status === 'reunified' ? 'Released to a guardian by ' : 'Confirmed by '}
                      {s.confirmedBy || 'a staff member'}
                      {s.confirmedAt ? ` at ${clock(s.confirmedAt)}` : ''}.
                    </Text>
                    {s.method ? (
                      <Text
                        style={{
                          fontFamily: F.mono,
                          fontSize: 11,
                          color: s.method === 'vouched' ? C.pending : C.inkSoft,
                        }}
                      >
                        {METHOD_LINE[s.method] || s.method}
                      </Text>
                    ) : null}
                    {s.coords ? (
                      <Where
                        lat={s.coords.lat}
                        lon={s.coords.lon}
                        accuracy={s.coords.accuracy}
                        place={s.place}
                        label={`${s.name} confirmed here`}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[T.body, { color: C.inkSoft }]}>
                      Nobody has confirmed {s.name.split(' ')[0]} yet. Tapping With me does it under your
                      name.
                    </Text>
                    {/* A teacher who cannot find a student can ask that
                        student's own phone, on the same terms as an
                        administrator: it is a request, and it can be refused. */}
                    <Locate student={s} />
                    {s.lastSeen ? (
                      <Text style={{ fontFamily: F.uiMed, fontSize: 14, color: C.ink }}>
                        Last seen: {s.lastSeen}
                        {s.lastSeenAt ? ` · reported ${clock(s.lastSeenAt)}` : ''}
                      </Text>
                    ) : null}
                  </>
                )}

                {/* The code exists so a staff member can ask for it. A teacher
                    knows this child by sight and never needs to, so it is not
                    printed here — showing it to the room would be the fastest
                    way to make it worthless. */}
                <Text style={[T.small, { fontSize: 12 }]}>
                  {s.name.split(' ')[0]} has a six-digit code they know by heart, for staff who do not know
                  them by sight. It is deliberately not shown on this screen.
                </Text>

                {!held ? (
                  <>
                    <Button
                      title={`${s.name.split(' ')[0]} is with me`}
                      onPress={() => {
                        confirmStudent(s.id, { place, by: teacher.short, method: 'roster' });
                        setDetail(null);
                      }}
                    />
                    <Button
                      title="Not in my room"
                      variant="secondary"
                      onPress={() => {
                        notHere(s);
                        setDetail(null);
                      }}
                    />
                  </>
                ) : (
                  <Button
                    title="Undo this confirmation"
                    variant="quiet"
                    onPress={() => {
                      undoConfirm(s.id);
                      setDetail(null);
                    }}
                  />
                )}
              </View>
            );
          })()
        ) : null}
      </Sheet>

      {/* ── What the board chip means ─────────────────────────────────────── */}
      <Sheet
        visible={boardSheet}
        onClose={() => setBoardSheet(false)}
        title={live ? 'On the shared board' : 'This phone only'}
        maxHeight="60%"
      >
        <Text style={T.body}>
          {live
            ? 'Every confirmation you make appears on every other phone in the building within a second, and theirs appear here.'
            : `Confirmations are being kept on this phone: ${board}.`}
        </Text>
        <Text style={[T.body, { marginTop: S.md }]}>
          {live
            ? 'If the network drops mid-event, keep confirming. Nothing you tap is lost; it is held here and sent the moment the board is reachable again.'
            : 'Keep confirming. Nothing you tap is lost, and the count on this phone stays correct for your room.'}
        </Text>
        {coords ? (
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: S.lg }}>
            last fix {coords}
          </Text>
        ) : null}
        <Button title="Got it" style={{ marginTop: S.xl }} onPress={() => setBoardSheet(false)} />
      </Sheet>
    </View>
  );
}

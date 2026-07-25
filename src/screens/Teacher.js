import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Chip, Glass, Rule, Sheet, StatusDot } from '../components/ui';
import Explain from '../components/Explain';
import Avatar from '../components/Avatar';
import { OFF_ROSTER } from '../data';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';

const FILTERS = [
  { id: 'action', label: 'Needs action' },
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
];

const ROOM = 'Chemistry';

function RowAction({ title, tone, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: 92,
        minHeight: 56,
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: tone === 'primary' ? C.accent : C.rule,
        backgroundColor: tone === 'primary' ? C.accent : C.card,
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

function StudentRow({ student, onConfirm, onNotHere, onUndo }) {
  const confirmed = student.status === 'verified';

  if (confirmed) {
    return (
      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md }}>
        <Avatar name={student.name} seed={student.id} size={38} ring={C.verified} />
        <View style={{ flex: 1 }}>
          {/* Serif means a person vouched for this. */}
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.ink }}>{student.name}</Text>
          <Text style={{ fontFamily: F.ui, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
            {student.confirmedBy || 'Confirmed'}
            {student.place ? ` at ${student.place}` : ''}
          </Text>
        </View>
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
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Avatar name={student.name} seed={student.id} size={38} />
        <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink, flexShrink: 1 }}>{student.name}</Text>
      </View>
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
    undoConfirm,
    addOffRoster,
    staffName,
    mode,
    eventActive,
  } = useVerifi();
  const { place, coords, status: locStatus, start: askLocation } = useLiveLocation({ active: eventActive });

  const [filter, setFilter] = useState('action');
  const [confirmAll, setConfirmAll] = useState(false);
  const [offlineSheet, setOfflineSheet] = useState(false);

  const room = clusters.find((c) => c.name === ROOM) || clusters[0];
  const roster = room.students;
  const done = roster.filter((s) => s.status === 'verified').length;
  const hasDevin = roster.some((s) => s.id === OFF_ROSTER.id);

  const visible = useMemo(() => {
    if (filter === 'action') return roster.filter((s) => s.status !== 'verified');
    if (filter === 'confirmed') return roster.filter((s) => s.status === 'verified');
    return roster;
  }, [roster, filter]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={T.title}>{room.name}</Text>
              <Text style={[T.small, { marginTop: S.xs }]}>
                Your roster only · {staffName}
              </Text>
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
            <Pressable
              onPress={() => setOfflineSheet(true)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: C.pending,
                backgroundColor: 'rgba(185,133,36,0.08)',
              }}
            >
              <Text style={{ fontFamily: F.monoMed, fontSize: 11, color: C.pending, letterSpacing: 0.4 }}>
                OFFLINE, 3 QUEUED
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
                backgroundColor: locStatus === 'on' ? 'rgba(47,125,104,0.08)' : C.card,
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
                if (s.status !== 'verified') confirmStudent(s.id, { place });
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

        <View style={[cardStyle, { paddingHorizontal: S.lg, paddingVertical: S.xs }]}>
          {visible.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Rule /> : null}
              <StudentRow
                student={s}
                onConfirm={() => confirmStudent(s.id, { place })}
                onNotHere={() => markNotWithClass(s.id)}
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

      <Sheet visible={offlineSheet} onClose={() => setOfflineSheet(false)} title="Working offline">
        <Text style={T.body}>
          The network is down in this wing. Confirmations are saved on this phone.
        </Text>
        <Text style={[T.body, { marginTop: S.md }]}>
          They sync the moment you are back. Keep confirming, nothing you tap is lost.
        </Text>
        <View style={{ marginTop: S.lg, gap: S.sm }}>
          {roster
            .filter((s) => s.status === 'verified')
            .slice(0, 3)
            .map((s) => (
              <Text key={s.id} style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>
                {s.name} · with me · queued
              </Text>
            ))}
        </View>
        {coords ? (
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: S.lg }}>
            last fix {coords}
          </Text>
        ) : null}
        <Button title="Got it" style={{ marginTop: S.xl }} onPress={() => setOfflineSheet(false)} />
      </Sheet>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { StatusDot } from '../components/ui';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Explain from '../components/Explain';
import Logo from '../components/Logo';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { enabledProviders, isConfigured } from '../supabase';

// Who is holding the phone. The order is the order a room needs them in.
const ROLES = [
  {
    id: 'scan',
    icon: 'scan',
    title: 'Staff',
    desc: 'Scan a student code with the camera and confirm the person in front of you.',
    cta: 'SCAN A STUDENT',
  },
  {
    id: 'admin',
    icon: 'shield',
    title: 'Administrator',
    desc: 'The live count for the whole school, the open cases, and the all clear.',
    cta: 'OPEN THE BOARD',
  },
  {
    id: 'teacher',
    icon: 'badge',
    title: 'Teacher',
    desc: 'Only the students on your own roster, one at a time, on or off the network.',
    cta: 'TAKE MY ROOM',
  },
  {
    id: 'student',
    icon: 'check',
    title: 'Student',
    desc: 'Show the code staff scan. Nothing else to do, and nothing else to see.',
    cta: 'SHOW MY CODE',
  },
  {
    id: 'parent',
    icon: 'family',
    title: 'Parent',
    desc: 'One line about your child, the moment a person confirms them.',
    cta: 'VIEW UPDATES',
  },
];

function RoleCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.cta}`}
      style={({ pressed }) => [
        cardStyle,
        { padding: S.lg, gap: 6, borderColor: pressed ? C.accent : C.rule, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <Icon name={item.icon} size={26} />
      <Text style={[T.heading, { fontSize: 20, marginTop: S.xs }]}>{item.title}</Text>
      <Text style={[T.small, { lineHeight: 20 }]}>{item.desc}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm }}>
        <Text style={{ fontFamily: F.monoMed, fontSize: 12, letterSpacing: 1.2, color: C.accent }}>
          {item.cta}
        </Text>
        <Text style={{ fontFamily: F.monoMed, fontSize: 13, color: C.accent }}>→</Text>
      </View>
    </Pressable>
  );
}

export default function Home({ navigate }) {
  const { mode, setMode, counts, board, live, user, staffName, eventActive, startNewEvent, endEvent } = useVerifi();
  const { status: locStatus, place, start: askLocation } = useLiveLocation({ active: eventActive });
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (isConfigured()) enabledProviders().then(setProviders);
  }, []);

  const total = counts.verified + counts.pending;

  return (
    <ScrollView
        automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }}
      keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Logo size={44} />
        <View style={{ flex: 1 }}>
          <Text style={[T.display, { lineHeight: 34 }]}>Verifi</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 25, color: C.inkSoft, marginTop: 6 }}>
            Every student accounted for.
          </Text>
        </View>
        <Pressable
          onPress={() => navigate('signin')}
          accessibilityRole="button"
          accessibilityLabel={user ? `Signed in as ${staffName}` : 'Sign in'}
        >
          <Avatar
            name={staffName}
            seed={user?.email || staffName}
            uri={user?.user_metadata?.avatar_url}
            size={44}
            ring={user ? C.verified : undefined}
          />
        </Pressable>
      </View>

      <Explain route="home" style={{ marginTop: S.sm }} />

      {/* The count answers the only question before anyone taps anything. */}
      <View
        style={[
          cardStyle,
          { marginTop: S.xl, padding: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={T.label}>Right now</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={{ fontFamily: F.monoSemi, fontSize: 30, color: C.verified }}>{counts.verified}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 16, color: C.inkSoft }}> / {total}</Text>
            <Text style={[T.small, { marginLeft: S.sm }]}>confirmed by a person</Text>
          </View>
        </View>
        {counts.pending > 0 ? <StatusDot status="pending" size={10} /> : null}
      </View>

      <View style={{ marginTop: S.lg, gap: 12 }}>
        {ROLES.map((r) => (
          <RoleCard key={r.id} item={r} onPress={() => navigate(r.id)} />
        ))}
      </View>

      {/* Location, for the length of the event and no longer. */}
      <View style={[cardStyle, { marginTop: S.lg, padding: S.lg, gap: S.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Icon name="scan" size={22} color={locStatus === 'on' ? C.verified : C.inkSoft} />
          <View style={{ flex: 1 }}>
            <Text style={[T.heading, { fontSize: 16 }]}>
              {!eventActive
                ? 'Location is off'
                : locStatus === 'on'
                ? 'Location on for this drill'
                : 'Location is off'}
            </Text>
            <Text style={[T.small, { marginTop: 2 }]}>
              {!eventActive
                ? 'It switches on when an event starts and stops the moment one ends.'
                : locStatus === 'on'
                ? `Confirmations are stamped ${place || 'as soon as a fix arrives'}. It stops when the drill ends.`
                : locStatus === 'denied' || locStatus === 'blocked'
                ? 'Refused. Turn it on in Settings if you want confirmations to carry a place.'
                : 'Used only to record where a staff member confirmed a student, never to track a child.'}
            </Text>
          </View>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: locStatus === 'on' && eventActive ? C.verified : C.absent,
            }}
          />
        </View>
        {eventActive && locStatus !== 'on' ? (
          <Pressable
            onPress={askLocation}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: R.card,
              borderWidth: 1,
              borderColor: C.rule,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.accent }}>Allow location</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Drill or live. The badge at the top of every screen follows this. */}
      <View style={{ marginTop: S.xl }}>
        <Text style={T.label}>Event mode</Text>
        <View
          style={{
            flexDirection: 'row',
            marginTop: S.sm,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.rule,
            borderRadius: R.card,
            padding: 4,
            gap: 4,
          }}
        >
          {['drill', 'live'].map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: active ? C.accent : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.uiSemi,
                    fontSize: 13,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: active ? '#FFFFFF' : C.inkSoft,
                  }}
                >
                  {m === 'drill' ? 'Drill' : 'Live'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[T.small, { marginTop: S.sm }]}>
          {mode === 'drill'
            ? 'Practice event, no real emergency.'
            : 'Live event. Everything you confirm is real.'}
        </Text>

        <Pressable
          onPress={() => (eventActive ? endEvent() : navigate('start'))}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 52,
            marginTop: S.md,
            borderRadius: R.card,
            borderWidth: 1,
            borderColor: eventActive ? C.rule : C.accent,
            backgroundColor: eventActive ? C.card : C.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: F.uiSemi,
              fontSize: 14,
              color: eventActive ? C.ink : '#FFFFFF',
            }}
          >
            {eventActive ? 'End the event' : 'Start an event, administrators only'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => navigate('ready')}
        accessibilityRole="button"
        style={({ pressed }) => ({
          marginTop: S.md,
          minHeight: 48,
          borderRadius: R.card,
          borderWidth: 1,
          borderColor: C.rule,
          backgroundColor: C.card,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.accent }}>
          Run the ready check
        </Text>
      </Pressable>

      <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: S.xl }}>
        {live
          ? 'shared board · every phone sees the same count'
          : board === 'connecting'
          ? 'connecting to the shared board'
          : `this phone only · ${board}`}
        {providers.length ? ` · sign in: ${providers.join(', ')}` : ''}
      </Text>
    </ScrollView>
  );
}

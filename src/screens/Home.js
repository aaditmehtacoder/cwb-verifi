import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import { BoxButton, Glass, StatusDot } from '../components/ui';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Explain from '../components/Explain';
import Logo from '../components/Logo';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { enabledProviders, isConfigured } from '../supabase';

/**
 * Who is holding the phone.
 *
 * Five small boxes on one screen, in the order a room needs them. It used to be
 * five stacked cards with a paragraph each, which is a reasonable way to explain
 * a product and a poor way to pick between things during a lockdown. The
 * sentence that mattered stays under each label; the paragraph moved into the
 * question mark, where somebody can read it on a quiet Tuesday.
 */
const ROLES = [
  { id: 'scan', icon: 'scan', title: 'Staff', sub: 'Scan a student and confirm them' },
  { id: 'admin', icon: 'shield', title: 'Administrator', sub: 'The whole board, live' },
  { id: 'teacher', icon: 'badge', title: 'Teacher', sub: 'Your own roster only' },
  { id: 'student', icon: 'check', title: 'Student', sub: 'Show the code staff scan' },
  { id: 'parent', icon: 'family', title: 'Parent', sub: 'One line about your child' },
  { id: 'chat', icon: 'mail', title: 'Messages', sub: 'The thread, and the assistant' },
];

export default function Home({ navigate }) {
  const { mode, setMode, counts, board, live, user, staffName, eventActive, endEvent } = useVerifi();
  const { status: locStatus, place, start: askLocation } = useLiveLocation({ active: eventActive });
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (isConfigured()) enabledProviders().then(setProviders);
  }, []);

  const total = counts.verified + counts.pending;

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.xl, paddingBottom: 96 }}
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

      {/* The count answers the only question anybody has before tapping anything. */}
      <Glass
        intensity={30}
        style={{
          marginTop: S.md,
          borderRadius: R.card,
          padding: S.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={T.label}>Right now</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={{ fontFamily: F.monoSemi, fontSize: 30, color: C.verified }}>{counts.verified}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 16, color: C.inkSoft }}> / {total}</Text>
            <Text style={[T.small, { marginLeft: S.sm, flexShrink: 1 }]}>confirmed by a person</Text>
          </View>
        </View>
        {counts.pending > 0 ? <StatusDot status="pending" size={10} /> : null}
      </Glass>

      {/* Pick what you are. Two per row, thumb sized, no reading required. */}
      <Text style={[T.label, { marginTop: S.xl }]}>I am</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.sm }}>
        {ROLES.map((r) => (
          <BoxButton
            key={r.id}
            width="47.6%"
            label={r.title}
            sub={r.sub}
            icon={(tint) => <Icon name={r.icon} size={24} color={tint} />}
            onPress={() => navigate(r.id)}
          />
        ))}
      </View>

      {/* Location, for the length of the event and no longer. */}
      <Glass intensity={22} style={{ marginTop: S.lg, borderRadius: R.card, padding: S.lg, gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Icon name="scan" size={22} color={locStatus === 'on' ? C.verified : C.inkSoft} />
          <View style={{ flex: 1 }}>
            <Text style={[T.heading, { fontSize: 16 }]}>
              {!eventActive
                ? 'Location is off'
                : locStatus === 'on'
                ? 'Location on for this event'
                : 'Location is off'}
            </Text>
            <Text style={[T.small, { marginTop: 2 }]}>
              {!eventActive
                ? 'It switches on when an event starts and stops the moment one ends.'
                : locStatus === 'on'
                ? `Confirmations are stamped ${place || 'as soon as a fix arrives'}. It stops when the event ends.`
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
              backgroundColor: 'rgba(255,255,255,0.7)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.accent }}>Allow location</Text>
          </Pressable>
        ) : null}
      </Glass>

      {/* Drill or live. The badge at the top of every screen follows this. */}
      <View style={{ marginTop: S.xl }}>
        <Text style={T.label}>Event mode</Text>
        <View
          style={{
            flexDirection: 'row',
            marginTop: S.sm,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.9)',
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
            backgroundColor: eventActive ? 'rgba(255,255,255,0.75)' : C.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: eventActive ? C.ink : '#FFFFFF' }}>
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
          backgroundColor: 'rgba(255,255,255,0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.accent }}>Run the ready check</Text>
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

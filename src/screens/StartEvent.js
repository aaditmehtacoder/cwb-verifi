import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Rule } from '../components/ui';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import { useVerifi } from '../store';
import { ADMIN } from '../data';

/**
 * Nothing in Verifi runs until somebody with authority says so.
 *
 * The start word is spoken out loud across an office, so it is one short word
 * rather than a password anybody would have to look up. Starting writes a line
 * into the shared thread, which is how every other phone in the building finds
 * out within a second.
 */
export default function StartEvent({ navigate }) {
  const { startEvent, eventActive, startedBy, elapsed, mode, endEvent, counts } = useVerifi();
  const [word, setWord] = useState('');
  const [kind, setKind] = useState('drill');
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setNote(null);
    const r = await startEvent({ password: word, by: ADMIN.short, kind });
    setBusy(false);
    if (r.ok) {
      setWord('');
      navigate('admin');
    } else {
      setNote(r.reason);
    }
  };

  if (eventActive) {
    return (
      <ScrollView contentContainerStyle={{ padding: S.xl }} showsVerticalScrollIndicator={false}>
        <Text style={T.title}>An event is running</Text>
        <View style={[cardStyle, { marginTop: S.lg, padding: S.lg, gap: S.sm }]}>
          <Text style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 26, color: C.ink }}>
            {mode === 'drill' ? 'Drill' : 'Lockdown'} started by {startedBy || 'an administrator'}.
          </Text>
          <Text style={{ fontFamily: F.mono, fontSize: 13, color: C.inkSoft }}>
            running {elapsed} · {counts.verified} confirmed · {counts.pending} open
          </Text>
        </View>
        <Button title="Open the board" style={{ marginTop: S.md }} onPress={() => navigate('admin')} />
        <Button
          title="End the event"
          variant="secondary"
          style={{ marginTop: S.sm }}
          onPress={async () => {
            await endEvent({ by: ADMIN.short });
            navigate('home');
          }}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: S.xl, paddingTop: S.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <Logo size={64} />
        </View>
        <Text style={[T.title, { textAlign: 'center', marginTop: S.lg }]}>Start an event</Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 16,
            lineHeight: 24,
            color: C.inkSoft,
            textAlign: 'center',
            marginTop: S.sm,
          }}
        >
          Nothing counts, alerts, or records a location until this is started.
        </Text>

        <View style={[cardStyle, { marginTop: S.xl, padding: S.lg, gap: S.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Avatar name={ADMIN.name} seed={ADMIN.id} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{ADMIN.name}</Text>
              <Text style={[T.small, { marginTop: 1 }]}>{ADMIN.title}</Text>
            </View>
          </View>

          <Rule />

          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {[
              { id: 'drill', label: 'Drill' },
              { id: 'live', label: 'Real event' },
            ].map((k) => (
              <Pressable
                key={k.id}
                onPress={() => setKind(k.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === k.id }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: R.small,
                  borderWidth: 1,
                  borderColor: kind === k.id ? C.accent : C.rule,
                  backgroundColor: kind === k.id ? C.accent : C.card,
                }}
              >
                <Text
                  style={{
                    fontFamily: F.uiSemi,
                    fontSize: 13,
                    color: kind === k.id ? '#FFFFFF' : C.inkSoft,
                  }}
                >
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.md,
              minHeight: 58,
              paddingHorizontal: S.lg,
              borderRadius: R.card,
              borderWidth: 1,
              borderColor: note ? C.pending : C.rule,
              backgroundColor: C.card,
            }}
          >
            <Icon name="lock" size={19} color={C.inkSoft} />
            <TextInput
              value={word}
              onChangeText={(v) => {
                setWord(v);
                setNote(null);
              }}
              onSubmitEditing={go}
              placeholder="Start word"
              placeholderTextColor={C.absent}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{
                flex: 1,
                fontFamily: F.monoMed,
                fontSize: 17,
                letterSpacing: 4,
                color: C.ink,
                paddingVertical: S.md,
              }}
            />
          </View>

          {note ? <Text style={[T.small, { color: C.pending }]}>{note}</Text> : null}

          <Button
            title={busy ? 'Starting' : kind === 'drill' ? 'Start the drill' : 'Start the event'}
            variant={kind === 'live' ? 'verified' : 'primary'}
            onPress={go}
            disabled={!word.trim() || busy}
          />

          <Text style={[T.small, { fontSize: 12 }]}>
            Starting alerts every phone in the building and writes a line into the shared thread.
          </Text>
        </View>

        <Button title="Back to home" variant="quiet" style={{ marginTop: S.lg }} onPress={() => navigate('home')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

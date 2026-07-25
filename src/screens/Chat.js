import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Glass, Rule } from '../components/ui';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Explain from '../components/Explain';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { fetchMessages, isConfigured, sendMessage, subscribeToMessages } from '../supabase';
import { answerInThread } from '../ai';

/**
 * The thread opens on a set of small boxes, all on one screen, no scrolling.
 * Each one is a different way to ask, and the assistant answers in that way.
 * Choosing beats typing when your hands are shaking.
 */
const WAYS = [
  { id: 'open', icon: 'shield', label: 'Who is open', ask: 'Who is still open right now?' },
  { id: 'where', icon: 'scan', label: 'Where to look', ask: 'Where should I look next, and why?' },
  { id: 'sum', icon: 'grid', label: 'Sum it up', ask: 'Summarise the board in two sentences.' },
  { id: 'parents', icon: 'family', label: 'Tell parents', ask: 'What should we tell parents right now?' },
  { id: 'next', icon: 'check', label: 'What next', ask: 'What is the single next thing a staff member should do?' },
  { id: 'talk', icon: 'mail', label: 'Talk to staff', ask: null },
];

const clock = (iso) =>
  new Date(iso || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, mine }) {
  const assistant = m.role === 'assistant';
  if (m.role === 'system') {
    return (
      <View style={{ alignItems: 'center', paddingVertical: S.md }}>
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, textAlign: 'center' }}>
          {m.body}
        </Text>
      </View>
    );
  }

  if (assistant) {
    return (
      <View style={{ marginBottom: S.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 6 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(18,79,76,0.09)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={13} />
          </View>
          <Text style={[T.label, { fontSize: 10, color: C.accent }]}>Assistant, not a confirmation</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }}>{clock(m.created_at)}</Text>
        </View>
        <View
          style={{
            backgroundColor: 'rgba(18,79,76,0.05)',
            borderLeftWidth: 1,
            borderLeftColor: C.accent,
            borderRadius: 8,
            padding: S.md,
          }}
        >
          <Text style={{ fontFamily: F.ui, fontSize: 15, lineHeight: 23, color: C.ink }}>{m.body}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: S.md, marginBottom: S.lg, alignItems: 'flex-start' }}>
      {!mine ? <Avatar name={m.author} seed={m.author} size={32} /> : null}
      <View style={{ flex: 1, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 4 }}>
          <Text style={{ fontFamily: F.uiSemi, fontSize: 12, color: C.ink }}>{mine ? 'You' : m.author}</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }}>{clock(m.created_at)}</Text>
        </View>
        <View
          style={{
            maxWidth: '92%',
            paddingHorizontal: S.md,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: mine ? C.accent : C.card,
            borderWidth: mine ? 0 : 1,
            borderColor: C.rule,
          }}
        >
          <Text style={{ fontFamily: F.ui, fontSize: 15, lineHeight: 22, color: mine ? '#FFFFFF' : C.ink }}>
            {m.body}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Chat() {
  const { staffName, counts, all, raise, eventActive } = useVerifi();
  const { place } = useLiveLocation({ active: eventActive });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState(isConfigured() ? 'loading' : 'this phone only');
  const [limit, setLimit] = useState(null);
  const [mode, setMode] = useState(null);
  const scroller = useRef(null);

  const toBottom = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchMessages();
      if (cancelled) return;
      if (rows) {
        setMessages(rows);
        setStatus('live');
      } else {
        setStatus('messages table not created yet');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'live') return undefined;
    return subscribeToMessages((row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      toBottom();
      if (row.author !== staffName && row.role === 'staff') {
        // The thread is how staff talk to each other during an event. A family
        // reading it would be reading about other people's children, so it
        // never reaches the parent or student views.
        const line = { title: row.author, detail: row.body };
        raise({ key: `msg:${row.id}`, audience: { admin: line, staff: line, teacher: line } });
      }
    });
  }, [status, staffName, raise]);

  const post = useCallback(
    async (body, role = 'staff', author = staffName) => {
      const local = {
        id: `local-${Date.now()}-${Math.random()}`,
        author,
        role,
        body,
        place: role === 'staff' ? place : null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, local]);
      toBottom();
      if (status === 'live') await sendMessage({ author, role, body, place: local.place });
    },
    [staffName, place, status]
  );

  // Everything said to the assistant gets an answer, whether or not it ends in
  // a question mark.
  const askAssistant = useCallback(
    async (question) => {
      setThinking(true);
      const open = all.filter((s) => s.status === 'pending').map((s) => s.name);
      const lastPlace = all.find((s) => s.place)?.place;
      const r = await answerInThread({
        question,
        board: { verified: counts.verified, pending: counts.pending, absent: counts.absent, open, lastPlace },
        history: messages.slice(-6),
      });
      setThinking(false);
      if (r.limitReached) setLimit(r.reason);
      await post(r.text, 'assistant', 'Verifi assistant');
    },
    [all, counts, messages, post]
  );

  const send = async (text, toAssistant) => {
    const body = (text ?? draft).trim();
    if (!body || thinking) return;
    setDraft('');
    await post(body);
    if (toAssistant ?? mode !== 'talk') await askAssistant(body);
  };

  const started = messages.some((m) => m.role !== 'system') || mode;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.sm }}>
        <Text style={T.title}>Messages</Text>
        <Explain route="chat" />
      </View>
      <Rule />

      {/* One screen of small boxes. Pick how you want the answer. */}
      {!started ? (
        <View style={{ flex: 1, padding: S.lg, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'center' }}>
            {WAYS.map((w) => (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                onPress={() => {
                  setMode(w.id);
                  if (w.ask) send(w.ask, true);
                }}
                style={({ pressed }) => [
                  cardStyle,
                  {
                    width: '46%',
                    aspectRatio: 1.15,
                    padding: S.md,
                    justifyContent: 'space-between',
                    borderColor: pressed ? C.accent : C.rule,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Icon name={w.icon} size={22} />
                <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{w.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[T.small, { textAlign: 'center', marginTop: S.lg, fontSize: 12 }]}>
            Pick one, or type below to reach every phone in the building.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: S.xl, paddingBottom: S.md }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={toBottom}
        >
          {messages.map((m) => (
            <Bubble key={m.id} m={m} mine={m.role === 'staff' && m.author === staffName} />
          ))}
          {thinking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg }}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={[T.small]}>Assistant is reading the board</Text>
            </View>
          ) : null}
          {limit ? (
            <View style={{ backgroundColor: 'rgba(185,133,36,0.09)', borderRadius: 10, padding: S.md }}>
              <Text style={[T.small, { color: C.ink }]}>
                The assistant is {limit}. The board, the scanning, and every count are unaffected.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Glass
        intensity={60}
        style={{
          margin: S.md,
          borderRadius: 24,
          padding: 6,
          paddingLeft: S.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.sm,
          backgroundColor: 'rgba(255,255,255,0.92)',
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send()}
          placeholder={mode === 'talk' ? 'Message every phone' : 'Ask the assistant, or tell the school'}
          placeholderTextColor={C.absent}
          multiline
          style={{ flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink, paddingVertical: S.md, maxHeight: 90 }}
        />
        <Pressable
          onPress={() => send()}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: draft.trim() ? C.accent : C.rule,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: F.monoSemi, fontSize: 17, color: '#FFFFFF' }}>↑</Text>
        </Pressable>
      </Glass>
    </KeyboardAvoidingView>
  );
}

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
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { fetchMessages, isConfigured, sendMessage, subscribeToMessages } from '../supabase';
import { answerInThread } from '../ai';

const PROMPTS = [
  'Who is still open?',
  'Where was the last confirmation?',
  'What should I check next?',
];

const clock = (iso) =>
  new Date(iso || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, mine }) {
  const assistant = m.role === 'assistant';
  const system = m.role === 'system';

  if (system) {
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
          {m.place ? (
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: S.sm }}>
              {m.place}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: S.md, marginBottom: S.lg, alignItems: 'flex-start' }}>
      {!mine ? <Avatar name={m.author} seed={m.author} size={32} /> : null}
      <View style={{ flex: 1, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 4 }}>
          <Text style={{ fontFamily: F.uiSemi, fontSize: 12, color: C.ink }}>
            {mine ? 'You' : m.author}
          </Text>
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
          <Text
            style={{
              fontFamily: F.ui,
              fontSize: 15,
              lineHeight: 22,
              color: mine ? '#FFFFFF' : C.ink,
            }}
          >
            {m.body}
          </Text>
        </View>
        {m.place ? (
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: 4 }}>{m.place}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function Chat() {
  const { staffName, counts, all, live, raise, eventActive } = useVerifi();
  const { place } = useLiveLocation({ active: eventActive });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState(isConfigured() ? 'loading' : 'this phone only');
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
        toBottom();
      } else {
        setStatus('messages table not created yet');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Anything anyone types, on any phone, lands here.
  useEffect(() => {
    if (status !== 'live') return undefined;
    return subscribeToMessages((row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      toBottom();
      if (row.author !== staffName && row.role === 'staff') {
        raise({ title: `${row.author}`, detail: row.body, status: 'verified', at: clock(row.created_at) });
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

  const send = async () => {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    await post(text);

    // The assistant answers when spoken to, and stays quiet otherwise.
    const addressed = /^(verifi|assistant|ai)\b/i.test(text) || text.includes('?');
    if (!addressed) return;

    setThinking(true);
    const open = all.filter((s) => s.status === 'pending').map((s) => s.name);
    const lastPlace = all.find((s) => s.place)?.place;
    const r = await answerInThread({
      question: text,
      board: { verified: counts.verified, pending: counts.pending, absent: counts.absent, open, lastPlace },
      history: messages.slice(-6),
    });
    setThinking(false);
    await post(r.text, 'assistant', 'Verifi assistant');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={26}
    >
      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.md }}>
        <Text style={T.title}>Messages</Text>
        <Text style={[T.small, { marginTop: 2 }]}>
          {status === 'live'
            ? 'Every phone in the building shares this thread.'
            : status === 'loading'
            ? 'Opening the thread'
            : `On this phone only, ${status}`}
        </Text>
      </View>
      <Rule />

      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.md }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={toBottom}
      >
        {messages.length === 0 ? (
          <View style={[cardStyle, { padding: S.lg, gap: S.sm }]}>
            <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 25, color: C.ink }}>
              Nothing yet.
            </Text>
            <Text style={T.small}>
              Anything typed here reaches every phone in the building. Ask a question and the assistant
              answers from the board.
            </Text>
          </View>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.role === 'staff' && m.author === staffName} />)
        )}

        {thinking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg }}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={[T.small, { color: C.inkSoft }]}>Assistant is reading the board</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Suggested questions, the way a person actually asks them. */}
      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {PROMPTS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setDraft(p)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                paddingHorizontal: S.md,
                minHeight: 36,
                justifyContent: 'center',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: C.rule,
                backgroundColor: pressed ? C.paper : C.card,
              })}
            >
              <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.inkSoft }}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

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
          onSubmitEditing={send}
          placeholder="Message the school, or ask a question"
          placeholderTextColor={C.absent}
          multiline
          style={{
            flex: 1,
            fontFamily: F.ui,
            fontSize: 15,
            color: C.ink,
            paddingVertical: S.md,
            maxHeight: 90,
          }}
        />
        <Pressable
          onPress={send}
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

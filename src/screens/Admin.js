import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Chip, Counter, FloatingBar, Rule, Sheet, StatusDot } from '../components/ui';
import { AccountabilityField } from '../components/Field';
import Avatar from '../components/Avatar';
import { CONFLICTS, EVIDENCE, STAFF, SUGGESTION, TEMPLATES } from '../data';
import { useVerifi } from '../store';
import { budget, suggestWhereToLook } from '../ai';

function CountBlock({ label, value, color }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Counter
        value={value}
        style={{ fontFamily: F.monoSemi, fontSize: 28, color: color || C.ink, lineHeight: 34 }}
      />
      <Text style={[T.label, { fontSize: 10, letterSpacing: 0.6, lineHeight: 14 }]}>{label}</Text>
    </View>
  );
}

function StackedBar({ counts }) {
  const total = counts.verified + counts.pending + counts.absent + counts.reunified || 1;
  const seg = (n, color) =>
    n > 0 ? <View key={color} style={{ flex: n / total, backgroundColor: color }} /> : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 6,
        marginTop: S.md,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: C.rule,
      }}
    >
      {seg(counts.verified, C.verified)}
      {seg(counts.pending, C.pending)}
      {seg(counts.reunified, C.reunified)}
      {seg(counts.absent, C.absent)}
    </View>
  );
}

function EvidenceTable() {
  return (
    <View style={{ marginTop: S.lg }}>
      <View style={{ flexDirection: 'row', paddingBottom: S.sm }}>
        <Text style={[T.label, { flex: 1.5, fontSize: 10 }]}>Source</Text>
        <Text style={[T.label, { flex: 1.4, fontSize: 10 }]}>Reading</Text>
        <Text style={[T.label, { width: 44, fontSize: 10, textAlign: 'right' }]}>Time</Text>
      </View>
      <Rule />
      {EVIDENCE.map((row) => (
        <View key={row.source}>
          <View style={{ flexDirection: 'row', paddingVertical: 10, alignItems: 'flex-start' }}>
            <Text style={{ flex: 1.5, fontFamily: F.ui, fontSize: 13, color: C.inkSoft, paddingRight: S.sm }}>
              {row.source}
            </Text>
            <Text style={{ flex: 1.4, fontFamily: F.uiMed, fontSize: 13, color: C.ink, paddingRight: S.sm }}>
              {row.reading}
            </Text>
            <Text style={{ width: 44, fontFamily: F.mono, fontSize: 12, color: C.inkSoft, textAlign: 'right' }}>
              {row.time}
            </Text>
          </View>
          <Rule />
        </View>
      ))}
    </View>
  );
}

// The AI can surface evidence and suggest. It can never change a status.
// The text below is written by a model at runtime; the label above it, the
// Archivo face it renders in, and the fact that the only button asks a human
// to go look are all fixed.
function SuggestionBlock() {
  // The written suggestion is on screen from the first frame. A model may
  // improve on it, and the line swaps when it answers, nobody waits on a
  // free-tier model during an event.
  const [state, setState] = useState({ phase: 'asking', text: SUGGESTION });
  const fade = useRef(new Animated.Value(1)).current;

  const ask = useCallback(
    async (force) => {
      setState((s) => ({ ...s, phase: 'asking' }));
      const r = await suggestWhereToLook({
        student: 'Maya Reyes',
        evidence: EVIDENCE,
        fallback: SUGGESTION,
        force,
      });
      fade.setValue(0);
      setState({ phase: 'done', ...r });
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    },
    [fade]
  );

  useEffect(() => {
    ask(false);
  }, [ask]);

  const { phase, text, model, ms, source, reason } = state;

  return (
    <View
      style={{
        marginTop: S.lg,
        backgroundColor: 'rgba(18,79,76,0.06)',
        borderLeftWidth: 1,
        borderLeftColor: C.accent,
        paddingVertical: S.md,
        paddingHorizontal: S.md,
        borderRadius: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[T.label, { fontSize: 10, color: C.accent, flex: 1 }]}>
          Suggestion, not a confirmation
        </Text>
        {phase === 'done' ? (
          <Pressable onPress={() => ask(true)} accessibilityRole="button" hitSlop={10}>
            <Text style={{ fontFamily: F.uiSemi, fontSize: 11, color: C.accent }}>Re-run</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.Text
        style={{
          fontFamily: F.ui,
          fontSize: 14,
          lineHeight: 21,
          color: C.ink,
          marginTop: S.sm,
          opacity: fade,
        }}
      >
        {text}
      </Animated.Text>

      <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: S.sm }}>
        {phase === 'asking'
          ? 'written suggestion · asking a model…'
          : source === 'model'
          ? `${model} · ${(ms / 1000).toFixed(1)}s · ${budget().left}/${budget().max} calls left`
          : `written suggestion · ${reason}`}
      </Text>
    </View>
  );
}

function Panel({ title, children, style }) {
  return (
    <View style={[cardStyle, { padding: S.lg }, style]}>
      <Text style={T.label}>{title}</Text>
      {children}
    </View>
  );
}

export default function Admin({ navigate }) {
  const { clusters, all, counts, mode, ringingId, dimField, announcement, setAnnouncement, reset, endEvent, elapsed, confirmStudent, staffName } = useVerifi();
  const [tile, setTile] = useState(null);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState('');
  const [armed, setArmed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [reassign, setReassign] = useState(null);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [draft, setDraft] = useState(TEMPLATES[0].body);
  const [sent, setSent] = useState(false);

  const pendingOpen = counts.pending > 0;
  const matches = query.trim()
    ? all.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={T.title}>Northgate High</Text>
            <Text style={[T.small, { marginTop: 2 }]}>
              {mode === 'drill' ? 'Lockdown drill' : 'Lockdown'} · started 10:15
            </Text>
          </View>
          <Pressable
            onPress={() => {
              endEvent();
              navigate('home');
            }}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center', paddingLeft: S.md }}
          >
            <Text style={{ fontFamily: F.uiSemi, fontSize: 12, color: C.accent }}>End drill</Text>
          </Pressable>
        </View>

        {/* Counts */}
        <View style={{ flexDirection: 'row', marginTop: S.xl, gap: S.sm }}>
          <CountBlock label="Verified" value={counts.verified} color={C.verified} />
          <CountBlock
            label={'Needs\nverification'}
            value={counts.pending}
            color={pendingOpen ? C.pending : C.inkSoft}
          />
          <CountBlock label="Absent" value={counts.absent} color={C.inkSoft} />
          <CountBlock label="Reunified" value={counts.reunified} color={C.inkSoft} />
        </View>
        <StackedBar counts={counts} />

        {/* The accountability field */}
        <View style={{ marginTop: S.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md }}>
            <Text style={[T.label, { flex: 1 }]}>Accountability field</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>{elapsed}</Text>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find a student"
            placeholderTextColor={C.absent}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: C.rule,
              borderRadius: R.card,
              paddingHorizontal: S.lg,
              fontFamily: F.ui,
              fontSize: 15,
              color: C.ink,
              backgroundColor: C.card,
              marginBottom: S.md,
            }}
          />
          {query.trim() ? (
            <View style={{ marginBottom: S.md, gap: S.xs }}>
              {matches.length === 0 ? (
                <Text style={T.small}>No student by that name.</Text>
              ) : (
                matches.slice(0, 6).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setTile(s)}
                    accessibilityRole="button"
                    style={[cardStyle, { padding: S.md, flexDirection: 'row', alignItems: 'center', gap: S.md }]}
                  >
                    <StatusDot status={s.status} />
                    <Text style={{ flex: 1, fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{s.name}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>{s.cluster}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
          <AccountabilityField
            clusters={clusters}
            onTilePress={setTile}
            ringingId={ringingId}
            dim={dimField}
          />
        </View>

        {/* Needs attention */}
        {pendingOpen ? (
          <Panel title="Needs attention" style={{ marginTop: S.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm }}>
              <StatusDot status="pending" size={10} />
              <Text style={T.heading}>Maya Reyes</Text>
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>Grade 10 · Chemistry</Text>
            </View>
            <EvidenceTable />
            <SuggestionBlock />
            <Button
              title="Scan to confirm"
              style={{ marginTop: S.lg }}
              onPress={() => navigate('scan')}
            />
          </Panel>
        ) : (
          <Panel title="Needs attention" style={{ marginTop: S.sm }}>
            <Text style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 26, color: C.ink, marginTop: S.sm }}>
              Nothing open. Every student confirmed by a person.
            </Text>
          </Panel>
        )}

        {/* Everything below is available, but out of the way, behind More. */}
        <Button
          title="Staff, conflicts, announcement"
          variant="secondary"
          style={{ marginTop: S.md }}
          onPress={() => setMore(true)}
        />
      </ScrollView>

      <Sheet visible={more} onClose={() => setMore(false)} title="Everything else" maxHeight="86%">
        <Panel title="Staff response">
          <View style={{ marginTop: S.sm }}>
            {STAFF.map((s, i) => (
              <View key={s.name}>
                {i > 0 ? <Rule /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: S.md, gap: S.md }}>
                  <Avatar name={s.name} seed={s.name} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{s.name}</Text>
                    <Text style={[T.small, { marginTop: 2 }]}>{s.room}</Text>
                  </View>
                  {s.state === 'waiting' ? (
                    <>
                      <Text style={{ fontFamily: F.monoMed, fontSize: 12, color: C.pending }}>{s.wait}</Text>
                      <Pressable
                        onPress={() => setReassign(s)}
                        accessibilityRole="button"
                        style={{ minHeight: 44, justifyContent: 'center' }}
                      >
                        <Text style={{ fontFamily: F.uiSemi, fontSize: 12, color: C.accent }}>Reassign</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>{s.seen}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title="Conflicts" style={{ marginTop: S.md }}>
          {CONFLICTS.map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.md }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{c.text}</Text>
                <Text style={[T.small, { marginTop: 2 }]}>{c.detail}</Text>
              </View>
              <Button
                title="Resolve"
                variant="secondary"
                style={{ paddingHorizontal: S.lg }}
                onPress={() => setConflict(c)}
              />
            </View>
          ))}
        </Panel>

        {/* The only free text entry in the emergency flow. */}
        <Panel title="Announcement" style={{ marginTop: S.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.md }}>
            {TEMPLATES.map((t) => (
              <Chip
                key={t.id}
                label={t.chip}
                active={template.id === t.id}
                onPress={() => {
                  setTemplate(t);
                  setDraft(t.body);
                  setSent(false);
                }}
              />
            ))}
          </View>

          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setSent(false);
            }}
            multiline
            style={{
              marginTop: S.md,
              minHeight: 96,
              borderWidth: 1,
              borderColor: C.rule,
              borderRadius: R.card,
              padding: S.md,
              fontFamily: F.ui,
              fontSize: 14,
              lineHeight: 21,
              color: C.ink,
              backgroundColor: C.paper,
              textAlignVertical: 'top',
            }}
          />

          <Text style={[T.label, { marginTop: S.lg }]}>Parents will see</Text>
          <View
            style={{
              marginTop: S.sm,
              borderWidth: 1,
              borderColor: C.rule,
              borderRadius: R.card,
              padding: S.md,
              backgroundColor: C.paper,
            }}
          >
            <Text style={{ fontFamily: F.uiSemi, fontSize: 13, color: C.ink }}>Verifi · Northgate High</Text>
            <Text style={[T.body, { fontSize: 14, marginTop: S.xs }]}>{draft}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: S.sm }}>
              10:41 · sent to 1,204 guardians
            </Text>
          </View>

          <Button
            title={sent ? 'Sent to guardians' : 'Send announcement'}
            variant={sent ? 'verified' : 'primary'}
            style={{ marginTop: S.md }}
            onPress={() => {
              setAnnouncement(draft);
              setSent(true);
            }}
          />
          {announcement && sent ? (
            <Text style={[T.small, { marginTop: S.sm }]}>
              Delivered in four languages. Guardians without the app get a text.
            </Text>
          ) : null}
        </Panel>

      </Sheet>

      <FloatingBar>
        <Button
          title="Declare all clear"
          variant={pendingOpen ? 'secondary' : 'verified'}
          subtitle={pendingOpen ? '1 student still needs a person' : 'Every student confirmed'}
          textStyle={pendingOpen ? { color: C.ink } : undefined}
          style={{
            borderRadius: 16,
            // When the field is still open the glass itself is the button, 
            // no second surface stacked inside it.
            backgroundColor: pendingOpen ? 'transparent' : C.verified,
            borderColor: pendingOpen ? 'transparent' : C.verified,
          }}
          onPress={() => (pendingOpen ? setBlocked(true) : navigate('allclear'))}
        />
      </FloatingBar>

      {/* Tile detail */}
      <Sheet visible={!!tile} onClose={() => setTile(null)} title={tile?.name} maxHeight="60%">
        {tile ? (
          <View style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Avatar name={tile.name} seed={tile.id} size={46} />
              <StatusDot status={tile.status} size={10} />
              <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>
                {tile.status === 'verified'
                  ? 'Verified by a person'
                  : tile.status === 'pending'
                  ? 'Needs verification'
                  : tile.status === 'absent'
                  ? 'Excused absence, not on campus'
                  : 'Released to guardian'}
              </Text>
            </View>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>
              {tile.id} · {tile.cluster}
            </Text>
            {tile.status === 'verified' ? (
              <>
                <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: C.ink }}>
                  Confirmed by {tile.confirmedBy || 'a staff member'}
                  {tile.confirmedAt
                    ? ` at ${new Date(tile.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                  .
                </Text>
                {tile.place ? (
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>
                    location {tile.place}
                    {tile.coords ? ` · ${tile.coords.lat.toFixed(5)}, ${tile.coords.lon.toFixed(5)}` : ''}
                  </Text>
                ) : null}
              </>
            ) : null}
            {tile.status === 'pending' ? (
              <>
                <EvidenceTable />
                <SuggestionBlock />
                <Button
                  title="Scan to confirm"
                  onPress={() => {
                    setTile(null);
                    setArmed(false);
                    navigate('scan');
                  }}
                />
                <Button
                  title={armed ? `Yes, I can see ${tile.name.split(' ')[0]}` : 'I can see this student'}
                  variant={armed ? 'verified' : 'secondary'}
                  onPress={() => {
                    if (!armed) {
                      setArmed(true);
                      return;
                    }
                    confirmStudent(tile.id, { by: staffName });
                    setArmed(false);
                    setTile(null);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* All clear blocked */}
      <Sheet visible={blocked} onClose={() => setBlocked(false)} title="One student is still open" maxHeight="52%">
        <Text style={T.body}>
          Maya Reyes has not been confirmed by a person. All clear stays closed until someone sees her.
        </Text>
        <Button
          title="Go to Nurse Checkpoint"
          style={{ marginTop: S.xl }}
          onPress={() => {
            setBlocked(false);
            navigate('scan');
          }}
        />
        <Button title="Stay here" variant="quiet" style={{ marginTop: S.sm }} onPress={() => setBlocked(false)} />
      </Sheet>

      {/* Conflict resolution */}
      <Sheet visible={!!conflict} onClose={() => setConflict(null)} title="Two rooms report Jordan Pike" maxHeight="56%">
        <Text style={T.body}>Pick the room where a staff member is looking at him right now.</Text>
        <View style={{ marginTop: S.lg, gap: S.sm }}>
          {[
            { room: 'Gym', who: 'D. Okonjo', at: '10:28' },
            { room: 'Room 204', who: 'K. Ansel', at: '10:31' },
          ].map((o) => (
            <Pressable
              key={o.room}
              accessibilityRole="button"
              onPress={() => setConflict(null)}
              style={{
                minHeight: 64,
                justifyContent: 'center',
                paddingHorizontal: S.lg,
                borderRadius: R.card,
                borderWidth: 1,
                borderColor: C.rule,
                backgroundColor: C.card,
              }}
            >
              <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{o.room}</Text>
              <Text style={[T.small, { marginTop: 2 }]}>
                {o.who} · reported {o.at}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* Reassign a silent room */}
      <Sheet visible={!!reassign} onClose={() => setReassign(null)} title="Reassign Cafeteria" maxHeight="52%">
        <Text style={T.body}>
          P. Whitcomb has not reported for 4 minutes. Send the nearest available staff member to count that
          room.
        </Text>
        <View style={{ marginTop: S.lg, gap: S.sm }}>
          {['J. Ferris, hallway, 40 ft away', 'M. Oduya, front office'].map((who) => (
            <Pressable
              key={who}
              accessibilityRole="button"
              onPress={() => setReassign(null)}
              style={{
                minHeight: 56,
                justifyContent: 'center',
                paddingHorizontal: S.lg,
                borderRadius: R.card,
                borderWidth: 1,
                borderColor: C.rule,
                backgroundColor: C.card,
              }}
            >
              <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{who}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

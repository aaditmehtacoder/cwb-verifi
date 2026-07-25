import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import { Button, Rule } from './ui';
import Track from './Track';
import { TRACK_MINUTES, useVerifi } from '../store';

/**
 * Locating a student nobody can find.
 *
 * The five states this can be in are the five things that can actually have
 * happened, and each one says what it is rather than what somebody wishes it
 * were. In particular, *overridden* is never dressed up as *sharing*: a report
 * written after the event must not be able to claim a child agreed to
 * something they never answered.
 *
 * The override exists because an unconscious student cannot tap a button, and
 * a system with no answer for that is a system that fails the child it was
 * built for. It is deliberately three steps deep, requires a name and a written
 * reason, tells the student's own phone that it happened, and expires by
 * itself. What it never does is happen on a timer, because a student hiding
 * from a threat is silent on purpose and the app cannot tell the two apart.
 */
const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

function Shell({ tone = C.rule, children, style }) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: tone,
          borderRadius: R.small,
          padding: S.md,
          gap: S.sm,
          backgroundColor: 'rgba(255,255,255,0.6)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function Locate({ student, style }) {
  const { trackingFor, askToLocate, overrideLocate, endLocate, staffName, live } = useVerifi();
  const [reason, setReason] = useState('');
  const [arming, setArming] = useState(false);
  const [note, setNote] = useState(null);

  if (!student) return null;
  const track = trackingFor(student.id);
  const first = student.name.split(' ')[0];
  const state = track?.state;

  const ask = async () => {
    const r = await askToLocate(student.id, staffName);
    setNote(r.ok ? null : r.reason);
  };

  // ── Reporting, by agreement or by override ────────────────────────────────
  if (state === 'sharing' || state === 'overridden') {
    const forced = state === 'overridden';
    return (
      <Shell tone={forced ? C.pending : C.verified} style={style}>
        <Text style={[T.label, { fontSize: 10, color: forced ? C.pending : C.verified }]}>
          {forced ? `Located without ${first}’s agreement` : `${first} agreed to share`}
        </Text>

        {forced ? (
          <>
            <Text style={{ fontFamily: F.uiMed, fontSize: 14, color: C.ink }}>
              {track.overriddenBy} turned this on. {first} did not answer.
            </Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: C.ink }}>
              “{track.overrideReason}”
            </Text>
            <Text style={[T.small, { fontSize: 12 }]}>
              Recorded as an override, not as consent, and {first}’s phone has been told it happened.
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: C.ink }}>
            {first} agreed at {clock(track.answeredAt)}.
          </Text>
        )}

        <Rule style={{ marginVertical: S.xs }} />
        <Track student={student} tracking={track} live={live} />

        <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }}>
          stops on its own when a person finds {first}, when the event ends, or at{' '}
          {clock(track.expiresAt)}
        </Text>
        <Button
          title="Stop locating"
          variant="secondary"
          onPress={() => endLocate(student.id, 'stopped by staff')}
        />
      </Shell>
    );
  }

  // ── Asked, waiting. The only place the override is offered ────────────────
  if (state === 'asked') {
    return (
      <Shell tone={C.pending} style={style}>
        <Text style={[T.label, { fontSize: 10, color: C.pending }]}>Waiting for {first} to answer</Text>
        <Text style={T.small}>
          Asked at {clock(track.askedAt)} by {track.askedBy}. Her phone is showing the request now.
        </Text>

        {!arming ? (
          <>
            <Text style={[T.small, { fontSize: 12 }]}>
              No answer does not mean yes. It can mean a phone in a bag, or a student hiding from
              something and staying quiet on purpose. Keep searching the usual way.
            </Text>
            <Pressable
              onPress={() => setArming(true)}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>
                {first} may be unable to answer
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={{ gap: S.sm }}>
            <Text style={[T.label, { fontSize: 10, color: C.pending }]}>Locate without agreement</Text>
            <Text style={T.small}>
              You are deciding to find {first} without an answer from them. This is recorded under your
              name, it is never recorded as consent, {first}’s phone will say that you did it, and it
              stops by itself after {TRACK_MINUTES} minutes.
            </Text>
            <Text style={[T.small, { fontSize: 12 }]}>Why is this necessary?</Text>
            <TextInput
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                setNote(null);
              }}
              placeholder="e.g. no answer for 6 minutes, last seen heading to the nurse"
              placeholderTextColor={C.absent}
              multiline
              style={{
                minHeight: 68,
                borderWidth: 1,
                borderColor: C.rule,
                borderRadius: R.small,
                padding: S.md,
                fontFamily: F.ui,
                fontSize: 14,
                lineHeight: 20,
                color: C.ink,
                backgroundColor: '#FFFFFF',
                textAlignVertical: 'top',
              }}
            />
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }}>
              signed {staffName}
            </Text>
            <Button
              title={`Locate ${first} without agreement`}
              disabled={reason.trim().length < 8}
              onPress={async () => {
                const r = await overrideLocate(student.id, staffName, reason.trim());
                if (!r.ok) {
                  setNote(r.reason);
                  return;
                }
                setArming(false);
                setReason('');
              }}
            />
            <Button
              title="Keep waiting"
              variant="quiet"
              onPress={() => {
                setArming(false);
                setNote(null);
              }}
            />
          </View>
        )}
        {note ? <Text style={[T.small, { color: C.pending }]}>{note}</Text> : null}
      </Shell>
    );
  }

  // ── Refused ───────────────────────────────────────────────────────────────
  if (state === 'refused') {
    return (
      <Shell style={style}>
        <Text style={[T.label, { fontSize: 10 }]}>{first} said no</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: C.ink }}>
          Nothing was sent.
        </Text>
        <Text style={T.small}>
          A refusal is an answer, not a failure. Keep searching the usual way, and send a person to the
          places she was last reported.
        </Text>
        <Button title="Ask once more" variant="secondary" onPress={ask} />
      </Shell>
    );
  }

  // ── Ended, or never started ───────────────────────────────────────────────
  return (
    <Shell style={style}>
      <Text style={[T.label, { fontSize: 10 }]}>Nobody can find {first}</Text>
      {state === 'ended' && track?.endedReason ? (
        <Text style={T.small}>Locating stopped — {track.endedReason}.</Text>
      ) : null}
      <Text style={T.small}>
        Ask {first}’s phone where she is. She sees the request and can refuse, nothing is sent unless
        she agrees, and it switches off by itself after {TRACK_MINUTES} minutes.
      </Text>
      <Button title={`Ask ${first} to share her location`} variant="secondary" onPress={ask} />
      {note ? <Text style={[T.small, { color: C.pending }]}>{note}</Text> : null}
    </Shell>
  );
}

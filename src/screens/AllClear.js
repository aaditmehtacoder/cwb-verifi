import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { C, F, S, T } from '../theme';
import { Button, Counter } from '../components/ui';
import { AccountabilityField } from '../components/Field';
import { useVerifi } from '../store';
import { dur, useReducedMotion } from '../motion';

// The end of the event. One orchestrated sequence, roughly 2.5 seconds.
// No confetti. No sound. This is relief, not victory.
export default function AllClear({ navigate }) {
  const { clusters, counts, ringingId, dimField, confirmStudent, maya, setAllClear } = useVerifi();
  const reduced = useReducedMotion();
  const [showLine, setShowLine] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  // Kept in a ref so the sequence is scheduled once, on mount, and store updates
  // mid-sequence cannot cancel the timers that produce the payoff.
  const latest = useRef({});
  latest.current = { confirmStudent, maya, setAllClear, reduced };

  useEffect(() => {
    const slow = !latest.current.reduced;
    const timers = [
      // 1. The tile crossfades pending → verified, emits one ring, the counter rolls, the field settles.
      setTimeout(() => {
        const { maya: m, confirmStudent: confirm } = latest.current;
        if (m?.status === 'pending') confirm(m.id);
      }, slow ? 320 : 0),
      // 2. Only then does the statement arrive.
      setTimeout(() => {
        setShowLine(true);
        latest.current.setAllClear(true);
      }, slow ? 1500 : 200),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showLine) return;
    Animated.timing(fade, {
      toValue: 1,
      duration: dur(reduced, 600),
      useNativeDriver: true,
    }).start();
  }, [showLine, fade, reduced]);

  return (
    <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.sm }}>
        <Counter
          value={counts.verified}
          style={{ fontFamily: F.monoSemi, fontSize: 32, color: C.verified, lineHeight: 38 }}
        />
        <Text style={{ fontFamily: F.mono, fontSize: 18, color: C.inkSoft }}>/ 100</Text>
        <View style={{ flex: 1 }} />
        <Text style={T.label}>Verified by a person</Text>
      </View>

      {/* The field, compact, so the whole room fits above the statement. */}
      <View style={{ marginTop: S.lg }}>
        <AccountabilityField clusters={clusters} ringingId={ringingId} dim={dimField} compact />
      </View>

      {showLine ? (
        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }}
        >
          {/* Serif, 32px: the one sentence everybody came for. */}
          <Text style={{ fontFamily: F.serif, fontSize: 32, lineHeight: 40, color: C.ink, marginTop: S.md }}>
            Every student accounted for.
          </Text>
          <Text style={[T.small, { marginTop: S.md }]}>
            100 of 100 students verified by a person. 10:42 AM.
          </Text>
          <Text style={[T.small, { marginTop: S.xs }]}>
            6 students were marked absent before the event and are not on campus.
          </Text>

          <Button
            title="Send all clear to guardians"
            style={{ marginTop: S.lg }}
            onPress={() => navigate('parent')}
          />
          <Button
            title="Back to the field"
            variant="secondary"
            style={{ marginTop: S.sm }}
            onPress={() => navigate('admin')}
          />
        </Animated.View>
      ) : (
        <Text style={[T.small, { marginTop: S.xl }]}>Confirming with the field…</Text>
      )}
    </ScrollView>
  );
}

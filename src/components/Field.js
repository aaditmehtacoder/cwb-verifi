import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import { dur, useReducedMotion } from '../motion';

const TILE = 28;
const GAP = 6;

const STATUS_BG = {
  verified: C.verified,
  pending: C.pending,
  absent: C.absent,
  reunified: C.reunified,
};

// One tile per student. Flat status color, initials in 9px mono.
// Status changes crossfade over 400ms, no bounce, no pop.
function Tile({ student, onPress, ringing, size = TILE }) {
  const reduced = useReducedMotion();
  const color = STATUS_BG[student.status];
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const prevStatus = useRef(student.status);

  useEffect(() => {
    if (prevStatus.current === student.status) return;
    prevStatus.current = student.status;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: dur(reduced, 400),
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [student.status, fade, reduced]);

  // The one pending tile breathes gently at 0.6–1.0 over 3 seconds.
  useEffect(() => {
    if (student.status !== 'pending' || reduced) {
      breathe.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [student.status, breathe, reduced]);

  // One slow ring outward on confirmation. It does not repeat.
  useEffect(() => {
    if (!ringing || reduced) return;
    ring.setValue(0);
    Animated.timing(ring, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [ringing, ring, reduced]);

  return (
    <Pressable
      onPress={onPress ? () => onPress(student) : undefined}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={`${student.name}, ${student.status}`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {ringing ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: C.verified,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 3.4] }) }],
          }}
        />
      ) : null}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size >= 24 ? R.tile : 3,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: Animated.multiply(fade, breathe),
        }}
      >
        {size >= 24 ? (
          <Text style={{ fontFamily: F.monoMed, fontSize: 9, color: '#FFFFFF', letterSpacing: 0.2 }}>
            {student.initials}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function Cluster({ cluster, onTilePress, ringingId, compact }) {
  const counts = cluster.students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const open = counts.pending || 0;
  const size = compact ? 16 : TILE;
  const gap = compact ? 4 : GAP;

  return (
    <View style={{ marginBottom: compact ? S.md : S.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: compact ? 6 : S.sm }}>
        <Text style={[T.label, compact ? { fontSize: 10, letterSpacing: 0.7 } : null]}>{cluster.name}</Text>
        <Text style={{ fontFamily: F.mono, fontSize: compact ? 10 : 11, color: C.inkSoft }}>
          {cluster.students.length - open}/{cluster.students.length}
        </Text>
        {cluster.teacher && !compact ? (
          <Text style={{ fontFamily: F.ui, fontSize: 11, color: C.inkSoft, opacity: 0.8 }}>
            {cluster.teacher}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {cluster.students.map((s) => (
          <Tile key={s.id} student={s} onPress={onTilePress} ringing={ringingId === s.id} size={size} />
        ))}
      </View>
    </View>
  );
}

// The accountability field: the visual anchor of the whole product.
export function AccountabilityField({ clusters, onTilePress, ringingId, dim, compact }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!dim || reduced) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.82, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [dim, opacity, reduced]);

  return (
    <Animated.View style={{ opacity }}>
      {clusters.map((c) => (
        <Cluster
          key={c.name}
          cluster={c}
          onTilePress={onTilePress}
          ringingId={ringingId}
          compact={compact}
        />
      ))}
    </Animated.View>
  );
}

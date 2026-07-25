import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { C, F, S } from '../theme';
import { Glass, StatusDot } from './ui';
import { dur, useReducedMotion } from '../motion';

/**
 * The banner that drops in when something happens elsewhere in the building.
 *
 * It sits above every screen, states who did what and where, and leaves on its
 * own. It never asks for a decision, because reading it must never cost the
 * person more than a glance.
 */
export default function Notice({ notice, onDismiss, onPress }) {
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!notice) return undefined;
    y.setValue(-1);
    Animated.timing(y, {
      toValue: 0,
      duration: dur(reduced, 320),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => {
      Animated.timing(y, {
        toValue: -1,
        duration: dur(reduced, 260),
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && onDismiss());
    }, 4200);

    return () => clearTimeout(t);
  }, [notice, y, reduced, onDismiss]);

  if (!notice) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: S.sm,
        left: S.md,
        right: S.md,
        zIndex: 50,
        transform: [{ translateY: y.interpolate({ inputRange: [-1, 0], outputRange: [-140, 0] }) }],
        opacity: y.interpolate({ inputRange: [-1, 0], outputRange: [0, 1] }),
      }}
    >
      <Pressable onPress={onPress} accessibilityRole="button">
        <Glass
          intensity={70}
          style={{
            borderRadius: 20,
            paddingVertical: S.md,
            paddingHorizontal: S.lg,
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderColor: 'rgba(221,226,225,0.9)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: S.md,
          }}
        >
          <StatusDot status={notice.status || 'verified'} size={10} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.ink }} numberOfLines={1}>
              {notice.title}
            </Text>
            {notice.detail ? (
              <Text
                style={{ fontFamily: F.ui, fontSize: 12, color: C.inkSoft, marginTop: 2 }}
                numberOfLines={1}
              >
                {notice.detail}
              </Text>
            ) : null}
          </View>
          {notice.at ? (
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>{notice.at}</Text>
          ) : null}
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

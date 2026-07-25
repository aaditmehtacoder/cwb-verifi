import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { C, F, MIN_TAP, R, S, T, cardStyle, glassStyle } from '../theme';
import { dur, useReducedMotion } from '../motion';

export function Label({ children, style }) {
  return <Text style={[T.label, style]}>{children}</Text>;
}

// Frosted material. Used only for chrome that floats over content, never for
// the content itself, so the reading surface stays flat and calm.
export function Glass({ children, style, intensity = 34, tint = 'light' }) {
  return (
    <BlurView intensity={intensity} tint={tint} style={[glassStyle, { overflow: 'hidden' }, style]}>
      {children}
    </BlurView>
  );
}

export function Rule({ style }) {
  return <View style={[{ height: 1, backgroundColor: C.rule }, style]} />;
}

export function Card({ children, style }) {
  return <View style={[cardStyle, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', style, textStyle, disabled, subtitle }) {
  const palette = {
    primary: { bg: C.accent, fg: '#FFFFFF', border: C.accent },
    secondary: { bg: C.card, fg: C.ink, border: C.rule },
    quiet: { bg: 'transparent', fg: C.accent, border: 'transparent' },
    verified: { bg: C.verified, fg: '#FFFFFF', border: C.verified },
  }[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          minHeight: MIN_TAP,
          paddingHorizontal: S.lg,
          paddingVertical: S.md,
          borderRadius: R.card,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <Text style={[{ fontFamily: F.uiSemi, fontSize: 15, color: palette.fg, letterSpacing: -0.1 }, textStyle]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: F.ui, fontSize: 12, color: palette.fg, opacity: 0.75, marginTop: 3 }}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, tone = 'default', style }) {
  const tones = {
    default: { on: C.accent, off: C.card, onFg: '#FFFFFF', offFg: C.inkSoft },
    pending: { on: C.pending, off: C.card, onFg: '#FFFFFF', offFg: C.pending },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          minHeight: 36,
          paddingHorizontal: S.md,
          justifyContent: 'center',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? tones.on : C.rule,
          backgroundColor: active ? tones.on : tones.off,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: F.uiMed,
          fontSize: 13,
          color: active ? tones.onFg : tones.offFg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusDot({ status, size = 8, style }) {
  const map = { verified: C.verified, pending: C.pending, absent: C.absent, reunified: C.reunified };
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: map[status] || C.absent },
        style,
      ]}
    />
  );
}

export function ScreenTitle({ title, sub, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={T.title}>{title}</Text>
        {sub ? <Text style={[T.small, { marginTop: S.xs }]}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Bottom sheet with a drag handle. Rendered inside the app surface, not a platform
// modal, so it stays within the phone frame on every target. Slides up; instant when
// motion is reduced.
export function Sheet({ visible, onClose, title, children, maxHeight = '78%' }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    const anim = Animated.timing(y, {
      toValue: visible ? 0 : 1,
      duration: dur(reduced, 280),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduced, y]);

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(22,35,42,0.22)', opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }) }],
        }}
      >
        <Glass
          intensity={60}
          style={{
            backgroundColor: 'rgba(255,255,255,0.86)',
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottomWidth: 0,
            paddingBottom: S.lg,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: S.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.rule }} />
          </View>
          {title ? (
            <>
              <Text style={[T.heading, { paddingHorizontal: S.xl, paddingBottom: S.md }]}>{title}</Text>
              <Rule />
            </>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: S.xl }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Glass>
      </Animated.View>
    </View>
  );
}

// A drawn check, the typographic check glyph is not reliable across the three faces.
export function Check({ size = 14, color = C.verified }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.32,
          height: size * 0.62,
          borderRightWidth: 1.6,
          borderBottomWidth: 1.6,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginLeft: size * 0.24,
          marginTop: -size * 0.1,
        }}
      />
    </View>
  );
}

// A floating glass bar pinned to the bottom of a screen, the one action that
// is always within thumb reach.
export function FloatingBar({ children, style }) {
  return (
    <View style={{ position: 'absolute', left: S.lg, right: S.lg, bottom: S.lg }} pointerEvents="box-none">
      {/* This bar floats over the accountability field, a hundred saturated
          tiles. A narrow blur leaves readable squares behind the label and a
          thin material lets their colour through, so: wide blur, dense white.
          What passes through is a wash, never a shape. */}
      <Glass
        intensity={80}
        style={[
          {
            borderRadius: 22,
            padding: S.sm,
            backgroundColor: 'rgba(255,255,255,0.93)',
            borderColor: 'rgba(221,226,225,0.9)',
          },
          style,
        ]}
      >
        {children}
      </Glass>
    </View>
  );
}

// A count that rolls to its next value in mono.
export function Counter({ value, style }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = React.useState(value);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value === shown) return;
    if (reduced) {
      setShown(value);
      return;
    }
    Animated.timing(slide, { toValue: 1, duration: 240, useNativeDriver: true }).start(() => {
      setShown(value);
      slide.setValue(0);
    });
  }, [value, shown, reduced, slide]);

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.Text
        style={[
          style,
          {
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
            opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          },
        ]}
      >
        {shown}
      </Animated.Text>
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { C, F, S } from '../theme';
import { dur, useReducedMotion } from '../motion';
import Logo from '../components/Logo';

// A short, quiet hold. Tap to skip; it advances on its own either way.
export default function Splash({ navigate }) {
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: dur(reduced, 500),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    Animated.timing(line, {
      toValue: 1,
      duration: dur(reduced, 1500),
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    const t = setTimeout(() => navigate('onboarding'), reduced ? 400 : 1900);
    return () => clearTimeout(t);
  }, [fade, line, reduced, navigate]);

  return (
    <Pressable
      onPress={() => navigate('onboarding')}
      accessibilityRole="button"
      accessibilityLabel="Continue"
      style={{ flex: 1, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', padding: S.xl }}
    >
      <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
        <Logo size={104} mono="#FFFFFF" />
        <Text
          style={{
            fontFamily: F.uiSemi,
            fontSize: 24,
            letterSpacing: -0.2,
            color: '#FFFFFF',
            marginTop: S.xl,
          }}
        >
          Verifi
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 16,
            lineHeight: 24,
            color: 'rgba(255,255,255,0.82)',
            marginTop: S.sm,
          }}
        >
          Every student accounted for.
        </Text>

        <View style={{ width: 120, height: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: S.xxl }}>
          <Animated.View
            style={{
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.7)',
              width: line.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          />
        </View>
      </Animated.View>

      <Text
        style={{
          position: 'absolute',
          bottom: S.xl,
          fontFamily: F.mono,
          fontSize: 10,
          letterSpacing: 1,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        FERPA COMPLIANT · DRILL READY
      </Text>
    </Pressable>
  );
}

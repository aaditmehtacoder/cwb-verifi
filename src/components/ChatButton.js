import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { C, F, S } from '../theme';
import Icon from './Icon';
import { useVerifi } from '../store';
import { useReducedMotion } from '../motion';

/**
 * The assistant, parked in the corner of every screen.
 *
 * It sits bottom right the way a help bubble does, out of the way of the one
 * action each screen is built around, and reachable without going home first.
 */
export default function ChatButton({ onPress }) {
  const { counts } = useVerifi();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const open = counts.pending;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: reduced ? 200 : 380,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [pop, reduced]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: S.lg,
        bottom: S.lg,
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Message the school"
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: C.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#16232A',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Icon name="mail" size={25} color="#FFFFFF" />
        {open > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 5,
              borderRadius: 11,
              backgroundColor: C.pending,
              borderWidth: 2,
              borderColor: C.paper,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: F.monoSemi, fontSize: 10, color: '#FFFFFF' }}>{open}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

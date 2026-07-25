import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, S, T } from '../theme';
import { Rule, Sheet } from './ui';
import { helpFor } from '../help';

/**
 * The one line at the top of a screen that says what it is for, and the
 * question mark that opens the full list of controls.
 *
 * Small and quiet on purpose. It has to be ignorable by someone who already
 * knows the screen and findable by someone who does not.
 */
export default function Explain({ route, style }) {
  const [open, setOpen] = useState(false);
  const help = helpFor(route);
  if (!help) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`What this screen does. ${help.line}`}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: S.sm,
            paddingVertical: S.sm,
            opacity: pressed ? 0.7 : 1,
          },
          style,
        ]}
      >
        <Text style={[T.small, { flex: 1, fontSize: 12.5 }]}>{help.line}</Text>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.rule,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: F.uiSemi, fontSize: 11, color: C.inkSoft }}>?</Text>
        </View>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={help.title} maxHeight="82%">
        <Text style={[T.body, { marginBottom: S.lg }]}>{help.line}</Text>
        {help.controls.map(([name, what], i) => (
          <View key={name}>
            {i > 0 ? <Rule style={{ marginVertical: S.md }} /> : null}
            <Text style={{ fontFamily: F.uiSemi, fontSize: 14, color: C.ink }}>{name}</Text>
            <Text style={[T.small, { marginTop: 3 }]}>{what}</Text>
          </View>
        ))}
      </Sheet>
    </>
  );
}

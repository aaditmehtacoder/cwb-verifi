import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { C, F, S, T } from '../theme';
import { Button, Sheet } from '../components/ui';
import { MAYA } from '../data';

const R = 20;
const CIRC = 2 * Math.PI * R;

// The ring is drawn straight from the countdown, one step per second.
function RefreshRing({ seconds }) {
  const remaining = Math.max(0, Math.min(30, seconds));
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={52} height={52}>
        <Circle cx={26} cy={26} r={R} stroke={C.rule} strokeWidth={3} fill="none" />
        <Circle
          cx={26}
          cy={26}
          r={R}
          stroke={C.accent}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={CIRC * (1 - remaining / 30)}
          transform="rotate(-90 26 26)"
        />
      </Svg>
      <Text style={{ position: 'absolute', fontFamily: F.mono, fontSize: 11, color: C.inkSoft }}>
        {seconds}
      </Text>
    </View>
  );
}

function useCode() {
  const [code, setCode] = useState('418209');
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s > 1) return s - 1;
        setCode(String(Math.floor(100000 + Math.random() * 899999)));
        return 30;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { code, seconds };
}

export default function Student() {
  const [open, setOpen] = useState(false);
  const { code, seconds } = useCode();

  // A real QR, not a picture of one, staff scan this with the camera.
  const payload = `VERIFI:${MAYA.id}:${code}`;

  return (
    <View style={{ flex: 1, padding: S.xl, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[T.title, { textAlign: 'center' }]}>Stay with your teacher.</Text>
      <Text style={[T.body, { color: C.inkSoft, marginTop: S.md, textAlign: 'center' }]}>
        Your school knows where you are.
      </Text>

      <Button title="Show my code" onPress={() => setOpen(true)} style={{ marginTop: S.xxl, minWidth: 220 }} />

      <Sheet visible={open} onClose={() => setOpen(false)} title="Your code">
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              padding: S.lg,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: C.rule,
              borderRadius: 12,
            }}
          >
            <QRCode value={payload} size={186} color={C.ink} backgroundColor="#FFFFFF" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg, marginTop: S.xl }}>
            <Text style={{ fontFamily: F.monoSemi, fontSize: 30, color: C.ink, letterSpacing: 2 }}>
              {code.slice(0, 3)} {code.slice(3)}
            </Text>
            <RefreshRing seconds={seconds} />
          </View>

          <Text style={[T.small, { marginTop: S.lg, textAlign: 'center' }]}>
            Staff scan this. You do not scan anything.
          </Text>
        </View>
        <Button title="Done" style={{ marginTop: S.xl }} onPress={() => setOpen(false)} />
      </Sheet>
    </View>
  );
}

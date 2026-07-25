import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { C, F, R as RAD, S, T, cardStyle } from '../theme';
import { Button, Sheet } from '../components/ui';
import Explain from '../components/Explain';
import Icon from '../components/Icon';
import { MAYA, spaced } from '../data';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';

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
  const { consent, answerConsent, eventActive } = useVerifi();
  const { place, start: askLocation } = useLiveLocation({ active: eventActive });

  // The school is asking this phone where it is. Nothing leaves the device
  // unless the student taps yes.
  const asked = consent?.studentId === MAYA.id && consent?.state === 'asked';

  // A real QR, not a picture of one, staff scan this with the camera.
  const payload = `VERIFI:${MAYA.id}:${code}`;

  return (
    <View style={{ flex: 1, padding: S.xl, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[T.title, { textAlign: 'center' }]}>Stay with your teacher.</Text>
      <Text style={[T.body, { color: C.inkSoft, marginTop: S.md, textAlign: 'center' }]}>
        Your school knows where you are.
      </Text>

      <Button title="Show my code" onPress={() => setOpen(true)} style={{ marginTop: S.xxl, minWidth: 220 }} />

      {asked ? (
        <View style={[cardStyle, { marginTop: S.xxl, padding: S.lg, gap: S.md, width: '100%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Icon name="shield" size={24} color={C.pending} />
            <View style={{ flex: 1 }}>
              <Text style={[T.heading, { fontSize: 17 }]}>The school is looking for you</Text>
              <Text style={[T.small, { marginTop: 2 }]}>
                {consent.by} asked if you will share where you are, just for this emergency.
              </Text>
            </View>
          </View>

          <Text style={T.small}>
            If you say yes, staff see the part of the building you are in until the event ends. If you say
            no, nothing is sent and nobody is told off. Either way, stay where it is safe.
          </Text>

          <Button
            title="Yes, share where I am"
            onPress={async () => {
              await askLocation();
              answerConsent(MAYA.id, true, place || 'sharing, waiting for a fix');
            }}
          />
          <Button
            title="No, do not share"
            variant="secondary"
            onPress={() => answerConsent(MAYA.id, false)}
          />
        </View>
      ) : null}

      {consent?.studentId === MAYA.id && consent?.state === 'shared' ? (
        <Text style={[T.small, { marginTop: S.xl, textAlign: 'center' }]}>
          You are sharing your location with staff until this event ends.
        </Text>
      ) : null}
      {consent?.studentId === MAYA.id && consent?.state === 'refused' ? (
        <Text style={[T.small, { marginTop: S.xl, textAlign: 'center' }]}>
          You said no. Nothing was sent.
        </Text>
      ) : null}

      <Explain route="student" style={{ marginTop: S.xl }} />

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

          {/* The code above expires in thirty seconds and needs a charged
              phone. This one does neither, and it is the only thing that gets
              a student counted when their phone is dead, in a locker, or was
              taken off them that morning. So it is on the same screen, not
              buried in a settings page nobody opens. */}
          <View
            style={{
              marginTop: S.xl,
              alignSelf: 'stretch',
              borderWidth: 1,
              borderColor: 'rgba(185,133,36,0.3)',
              backgroundColor: 'rgba(185,133,36,0.07)',
              borderRadius: RAD.card,
              padding: S.lg,
              gap: S.sm,
            }}
          >
            <Text style={[T.label, { fontSize: 10, color: C.pending }]}>Learn this by heart</Text>
            <Text
              style={{
                fontFamily: F.monoSemi,
                fontSize: 26,
                letterSpacing: 3,
                color: C.ink,
                textAlign: 'center',
                paddingVertical: S.xs,
              }}
            >
              {spaced(MAYA.code)}
            </Text>
            <Text style={[T.small, { textAlign: 'center' }]}>
              If your phone is dead or you do not have it, say these six digits to a staff member and they
              can still count you. This one never changes. Do not tell it to another student.
            </Text>
          </View>
        </View>
        <Button title="Done" style={{ marginTop: S.xl }} onPress={() => setOpen(false)} />
      </Sheet>
    </View>
  );
}

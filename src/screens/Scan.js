import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Rule, StatusDot } from '../components/ui';
import Explain from '../components/Explain';
import Avatar from '../components/Avatar';
import { useVerifi } from '../store';
import { useLiveLocation } from '../location';
import { useReducedMotion } from '../motion';

function Bracket({ corner, color = '#FFFFFF' }) {
  const base = { position: 'absolute', width: 30, height: 30, borderColor: color };
  const map = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  };
  return <View style={[base, map[corner]]} />;
}

export default function Scan({ navigate }) {
  const { confirmStudent, staffName, all, maya, eventActive } = useVerifi();
  const [permission, requestPermission] = useCameraPermissions();
  const { place, coords, status: locStatus, start: askLocation } = useLiveLocation({ active: eventActive });

  const [hit, setHit] = useState(null);
  const [armed, setArmed] = useState(false);
  const [manual, setManual] = useState('');
  const [notFound, setNotFound] = useState(null);
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const lock = useRef(false);

  useEffect(() => {
    if (reduced || hit) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, reduced, hit]);

  // VERIFI:<student id>:<6 digit code>, written by the student screen.
  const take = (raw) => {
    const m = /^VERIFI:([\w-]+):(\d{6})$/.exec((raw || '').trim());
    if (!m) return false;
    const student = all.find((s) => s.id === m[1]);
    if (!student) return false;
    lock.current = true;
    setNotFound(null);
    setHit({ student, code: m[2] });
    setArmed(false);
    return true;
  };

  const onScan = ({ data }) => {
    if (lock.current) return;
    take(data);
  };

  // A student whose phone is dead reads their six digits aloud.
  const byNumber = () => {
    const digits = manual.replace(/\D/g, '');
    if (digits.length < 4) return;
    const student = all.find((s) => s.id.endsWith(digits.slice(-4))) || null;
    if (student) {
      lock.current = true;
      setHit({ student, code: digits.padStart(6, '0') });
      setArmed(false);
      setNotFound(null);
    } else {
      setNotFound(digits);
    }
  };

  const reset = () => {
    lock.current = false;
    setHit(null);
    setArmed(false);
    setManual('');
    setNotFound(null);
  };

  const live = hit ? all.find((s) => s.id === hit.student.id) : null;
  const alreadyDone = live?.status === 'verified';
  const noCamera = Platform.OS === 'web';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }}
      >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={T.title}>Scan a student</Text>
          <Text style={[T.small, { marginTop: S.xs }]}>{staffName}</Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: locStatus === 'on' ? C.verified : C.rule,
            backgroundColor: locStatus === 'on' ? 'rgba(47,125,104,0.08)' : C.card,
          }}
        >
          <Text
            style={{
              fontFamily: F.monoMed,
              fontSize: 10,
              letterSpacing: 0.4,
              color: locStatus === 'on' ? C.verified : C.inkSoft,
            }}
            onPress={locStatus === 'on' ? undefined : askLocation}
          >
            {locStatus === 'on' ? place || 'LOCATING' : 'ENABLE LOCATION'}
          </Text>
        </View>
      </View>
      <Explain route="scan" />

      <View
        style={{
          marginTop: S.sm,
          height: 300,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: '#E7EAE9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {permission?.granted && !noCamera ? (
          <>
            <CameraView
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={hit ? undefined : onScan}
            />
            <View style={{ width: 190, height: 190 }}>
              <Bracket corner="tl" />
              <Bracket corner="tr" />
              <Bracket corner="bl" />
              <Bracket corner="br" />
              {!hit ? (
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 6,
                    right: 6,
                    height: 2,
                    backgroundColor: '#FFFFFF',
                    opacity: 0.8,
                    transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [8, 180] }) }],
                  }}
                />
              ) : null}
            </View>
          </>
        ) : (
          <View style={{ padding: S.xl, alignItems: 'center' }}>
            <Text style={[T.body, { textAlign: 'center' }]}>
              {noCamera
                ? 'This screen has no camera. Use the code entry below.'
                : 'Verifi needs the camera to read a student code.'}
            </Text>
            {!noCamera ? (
              <Button title="Allow camera" style={{ marginTop: S.lg }} onPress={requestPermission} />
            ) : null}
          </View>
        )}
      </View>

      {hit ? (
        <View style={[cardStyle, { marginTop: S.lg, padding: S.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Avatar
              name={hit.student.name}
              seed={hit.student.id}
              size={52}
              ring={alreadyDone ? C.verified : C.pending}
            />
            <View style={{ flex: 1 }}>
              <Text style={T.heading}>{hit.student.name}</Text>
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                {hit.student.id} · {hit.student.cluster} · code {hit.code}
              </Text>
            </View>
            {alreadyDone ? <Check size={18} /> : <StatusDot status="pending" size={10} />}
          </View>
          <Text style={[T.small, { marginTop: S.sm }]}>
            Check the face against the person in front of you before you confirm.
          </Text>

          <Rule style={{ marginVertical: S.md }} />

          {alreadyDone ? (
            <>
              <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 24, color: C.ink }}>
                {hit.student.name} is confirmed by {live?.confirmedBy || staffName}
                {live?.place ? ` at ${live.place}` : ''}.
              </Text>
              <Button title="Scan another" variant="secondary" style={{ marginTop: S.md }} onPress={reset} />
              <Button title="See the board" variant="quiet" style={{ marginTop: S.xs }} onPress={() => navigate('admin')} />
            </>
          ) : (
            <>
              <Text style={T.small}>
                You are vouching that you can see this student right now. The scan alone changes nothing.
              </Text>
              {place ? (
                <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: S.sm }}>
                  will be recorded at {place}
                </Text>
              ) : null}
              <Button
                title={armed ? `Yes, I see ${hit.student.name.split(' ')[0]}` : 'Confirm this student'}
                variant={armed ? 'verified' : 'primary'}
                style={{ marginTop: S.md }}
                onPress={() => {
                  if (!armed) {
                    setArmed(true);
                    return;
                  }
                  confirmStudent(hit.student.id, { code: hit.code, place });
                  navigate(hit.student.id === maya?.id ? 'allclear' : 'admin');
                }}
              />
              <Button title="Not this student" variant="quiet" style={{ marginTop: S.xs }} onPress={reset} />
            </>
          )}
        </View>
      ) : (
        <View style={[cardStyle, { marginTop: S.lg, padding: S.lg }]}>
          <Text style={T.label}>Phone dead or no code</Text>
          <Text style={[T.small, { marginTop: S.sm }]}>
            Ask the student for the last four digits of their student number.
          </Text>
          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
            <TextInput
              value={manual}
              onChangeText={(v) => {
                setManual(v);
                setNotFound(null);
              }}
              onSubmitEditing={byNumber}
              keyboardType="number-pad"
              placeholder="1007"
              placeholderTextColor={C.absent}
              maxLength={6}
              style={{
                flex: 1,
                minHeight: 56,
                borderWidth: 1,
                borderColor: C.rule,
                borderRadius: R.card,
                paddingHorizontal: S.lg,
                fontFamily: F.monoMed,
                fontSize: 20,
                letterSpacing: 3,
                color: C.ink,
                backgroundColor: C.paper,
              }}
            />
            <Button title="Find" onPress={byNumber} style={{ paddingHorizontal: S.xl }} />
          </View>
          {notFound ? (
            <Text style={[T.small, { marginTop: S.sm, color: C.pending }]}>
              No student ends in {notFound}. Check the digits and try again.
            </Text>
          ) : null}
          {coords ? (
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, marginTop: S.md }}>
              {coords}
            </Text>
          ) : null}
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
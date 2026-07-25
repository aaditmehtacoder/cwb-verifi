import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Check, Rule } from '../components/ui';
import Explain from '../components/Explain';
import Icon from '../components/Icon';
import { useVerifi } from '../store';
import { boardStatus, isConfigured } from '../supabase';
import { forget, notify, prepareNotifications } from '../notifications';

/**
 * The pre flight check.
 *
 * Everything this app needs from the phone is a permission that can be refused,
 * and every one of them fails silently at exactly the wrong moment. This screen
 * asks for each, proves it works, and says plainly what is still missing, on a
 * quiet day rather than during an event.
 */
function Row({ icon, title, detail, state, action, onPress }) {
  const tone = { ok: C.verified, warn: C.pending, off: C.absent }[state];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md }}>
        <Icon name={icon} size={22} color={state === 'ok' ? C.verified : C.inkSoft} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>{title}</Text>
          <Text style={[T.small, { marginTop: 2 }]}>{detail}</Text>
        </View>
        {state === 'ok' ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: C.verified,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={12} color="#FFFFFF" />
          </View>
        ) : (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone }} />
        )}
      </View>
      {action && state !== 'ok' ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 44,
            borderRadius: R.small,
            borderWidth: 1,
            borderColor: C.rule,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: S.sm,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={{ fontFamily: F.uiSemi, fontSize: 13, color: C.accent }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Ready({ navigate }) {
  const { eventActive, live, board, startNewEvent } = useVerifi();
  const [camera, setCamera] = useState('off');
  const [location, setLocation] = useState('off');
  const [alerts, setAlerts] = useState('off');
  const [boardNote, setBoardNote] = useState('checking');
  const [tested, setTested] = useState(null);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const cam = await Camera.getCameraPermissionsAsync().catch(() => null);
      setCamera(cam?.granted ? 'ok' : 'off');
      const loc = await Location.getForegroundPermissionsAsync().catch(() => null);
      setLocation(loc?.granted ? 'ok' : 'off');
      const note = await Notifications.getPermissionsAsync().catch(() => null);
      setAlerts(note?.granted ? 'ok' : 'off');
    } else {
      setCamera('off');
      setAlerts('off');
    }
    if (isConfigured()) {
      const problem = await boardStatus();
      setBoardNote(problem || null);
    } else {
      setBoardNote('no keys set');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allGood = camera === 'ok' && location === 'ok' && alerts === 'ok' && !boardNote;

  return (
    <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <Text style={T.title}>Ready check</Text>
      <Explain route="ready" />

      <View style={[cardStyle, { marginTop: S.md, paddingHorizontal: S.lg }]}>
        <Row
          icon="scan"
          title="Camera"
          detail={camera === 'ok' ? 'Ready to scan student codes.' : 'Needed to scan a student code.'}
          state={camera}
          action="Allow the camera"
          onPress={async () => {
            await Camera.requestCameraPermissionsAsync().catch(() => {});
            refresh();
          }}
        />
        <Rule />
        <Row
          icon="family"
          title="Location"
          detail={
            location === 'ok'
              ? 'Confirmations will carry the place they happened. On only while an event runs.'
              : 'Records where a staff member confirmed a student. Never tracks a child.'
          }
          state={location}
          action="Allow location"
          onPress={async () => {
            await Location.requestForegroundPermissionsAsync().catch(() => {});
            refresh();
          }}
        />
        <Rule />
        <Row
          icon="mail"
          title="Notifications"
          detail={
            alerts === 'ok'
              ? 'This phone will hear when another confirms the last open student.'
              : 'Without these you only learn of a confirmation by looking at the screen.'
          }
          state={alerts}
          action="Allow notifications"
          onPress={async () => {
            await prepareNotifications();
            refresh();
          }}
        />
        <Rule />
        <Row
          icon="shield"
          title="Shared board"
          detail={
            boardNote === 'checking'
              ? 'Checking the connection.'
              : boardNote
              ? `Every phone is on its own: ${boardNote}`
              : 'Connected. Every phone sees the same count.'
          }
          state={boardNote === 'checking' ? 'warn' : boardNote ? 'warn' : 'ok'}
          action="Check again"
          onPress={refresh}
        />
      </View>

      {/* Proving alerts arrive is the only way to know they will. */}
      <View style={[cardStyle, { marginTop: S.md, padding: S.lg, gap: S.md }]}>
        <Text style={T.label}>Prove it works</Text>
        <Text style={T.small}>
          Send yourself the notification a staff member gets when the last open student is confirmed.
        </Text>
        <Button
          title="Send a test notification"
          variant="secondary"
          onPress={async () => {
            const granted = await prepareNotifications();
            if (!granted) {
              setTested('Notifications are off, so nothing was sent.');
              refresh();
              return;
            }
            forget('test');
            const r = await notify(
              'Every student accounted for',
              'Test alert from Verifi. Nothing has changed on the board.',
              'test'
            );
            setTested(
              r.ok
                ? 'Sent. It should appear on this phone within a second.'
                : `Not sent: ${r.reason}.`
            );
            refresh();
          }}
        />
        {tested ? <Text style={[T.small, { color: C.ink }]}>{tested}</Text> : null}
        {Platform.OS === 'web' ? (
          <Text style={[T.small, { fontSize: 12 }]}>
            This screen is running in a browser, where phone permissions do not apply. Open it on a phone
            for a true reading.
          </Text>
        ) : null}
      </View>

      <View
        style={[
          cardStyle,
          {
            marginTop: S.md,
            padding: S.lg,
            gap: S.sm,
            borderColor: allGood ? C.verified : C.rule,
          },
        ]}
      >
        <Text style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 26, color: C.ink }}>
          {allGood
            ? 'This phone is ready for a drill.'
            : 'This phone can still run a drill, with the gaps above.'}
        </Text>
        <Text style={T.small}>
          {eventActive
            ? 'An event is running now.'
            : 'No event is running, so location stays off until one starts.'}
        </Text>
        {!eventActive ? (
          <Button title="Start an event" style={{ marginTop: S.sm }} onPress={startNewEvent} />
        ) : null}
      </View>

      <Button title="Back to home" variant="quiet" style={{ marginTop: S.md }} onPress={() => navigate('home')} />
    </ScrollView>
  );
}

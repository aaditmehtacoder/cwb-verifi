import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Rule, Sheet } from '../components/ui';
import Explain from '../components/Explain';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { LANGUAGES, translator } from '../i18n';
import { guardianCodeFor, spaced } from '../data';
import { useVerifi } from '../store';
import { useReducedMotion } from '../motion';

const CHILD = 'Maya';

// A slow pulsing ring. Not a spinner, not a progress bar.
function CalmPulse() {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);

  return (
    <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 96,
          height: 96,
          borderRadius: 48,
          borderWidth: 1,
          borderColor: C.pending,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}
      />
      <Animated.View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: C.pending,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
        }}
      />
    </View>
  );
}

function useTicker() {
  const [n, setN] = useState(14);
  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return n;
}

export default function Parent() {
  const { maya } = useVerifi();
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [langOpen, setLangOpen] = useState(false);
  const [onTheWay, setOnTheWay] = useState(false);
  const seconds = useTicker();
  const t = translator(lang.code);

  const released = maya?.status === 'reunified';
  const confirmed = maya?.status === 'verified' || released;
  const when = maya?.confirmedAt
    ? ` ${new Date(maya.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';

  // The pass code, derived from the student the same way the gate derives it,
  // so the two always agree without either one being told what the other holds.
  const studentId = maya?.id || 'S-1007';
  const passCode = maya?.guardianCode || guardianCodeFor(studentId);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Avatar
            name="Maya Reyes"
            seed={maya?.id || 'S-1007'}
            size={46}
            ring={confirmed ? C.verified : C.pending}
          />
          <View style={{ flex: 1 }}>
            <Text style={T.label}>{t('yourStudent')}</Text>
            <Text style={[T.heading, { marginTop: 2 }]}>Maya Reyes</Text>
          </View>
          <Pressable
            onPress={() => setLangOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('language')}: ${lang.label}`}
            style={{
              minHeight: 40,
              paddingHorizontal: S.md,
              justifyContent: 'center',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: C.rule,
              backgroundColor: C.card,
            }}
          >
            <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.ink }}>{lang.label}</Text>
          </Pressable>
        </View>

        {confirmed ? (
          <View style={{ paddingTop: S.xl }}>
            <View style={[cardStyle, { padding: S.xl }]}>
              {/* Serif: a person vouched for this. */}
              <Text style={{ fontFamily: F.serif, fontSize: 24, lineHeight: 33, color: C.ink }}>
                {released ? t('released', { name: CHILD }) : t('verified', { name: CHILD })}
              </Text>
              <Rule style={{ marginVertical: S.lg }} />
              <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>
                {released
                  ? t('releasedBody', { who: maya?.confirmedBy || 'school staff', when })
                  : t('confirmedBy', { who: maya?.confirmedBy || 'school staff', when })}
              </Text>
              {!released ? <Text style={[T.small, { marginTop: S.md }]}>{t('locationNote')}</Text> : null}
            </View>

            {!released ? (
              <View style={[cardStyle, { padding: S.lg, marginTop: S.md, gap: S.sm }]}>
                <Text style={T.label}>{t('nextTitle')}</Text>
                <Text style={T.small}>{t('nextBody')}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: S.xl }}>
            <CalmPulse />
            <Text style={[T.title, { marginTop: S.xl, textAlign: 'center' }]}>{t('inProgress')}</Text>
            <Text style={[T.body, { color: C.inkSoft, marginTop: S.md, textAlign: 'center' }]}>
              {t('waitingBody', { name: CHILD })}
            </Text>
            <Text style={{ fontFamily: F.mono, fontSize: 13, color: C.inkSoft, marginTop: S.xl }}>
              {t('lastUpdated', { n: seconds })}
            </Text>

            <View style={[cardStyle, { marginTop: S.xxl, padding: S.lg, width: '100%', gap: S.sm }]}>
              <Text style={T.label}>{t('happeningTitle')}</Text>
              <Text style={T.small}>{t('happeningBody')}</Text>
            </View>
          </View>
        )}

        {/* A parent on their way is information the school needs, and it never
            changes the child's status. Only a staff member does that. Once the
            child has actually been handed over there is nothing left to ask
            for, so the whole block goes away rather than sitting there stale. */}
        {!released ? (
          <View style={[cardStyle, { marginTop: S.md, padding: S.lg, gap: S.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Icon name="family" size={22} />
              <View style={{ flex: 1 }}>
                <Text style={[T.heading, { fontSize: 16 }]}>
                  {onTheWay ? t('checkedIn') : t('checkInTitle')}
                </Text>
              </View>
            </View>
            <Text style={T.small}>{onTheWay ? t('checkedInBody', { name: CHILD }) : t('checkInBody')}</Text>

            {onTheWay ? (
              <View style={{ alignItems: 'center', gap: S.md, marginTop: S.sm }}>
                {/* A real QR the gate actually reads, not a picture of one. The
                    staff camera parses this exact string, checks the code
                    against the student, and shows who is allowed to collect. */}
                <View
                  style={{
                    padding: S.md,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: C.rule,
                    borderRadius: 12,
                  }}
                >
                  <QRCode
                    value={`VERIFI-GUARDIAN:${studentId}:${passCode}`}
                    size={150}
                    color={C.ink}
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[T.label, { fontSize: 10 }]}>{t('passCode')}</Text>
                  <Text
                    style={{
                      fontFamily: F.monoSemi,
                      fontSize: 24,
                      color: C.ink,
                      letterSpacing: 3,
                      marginTop: 2,
                    }}
                  >
                    {spaced(passCode)}
                  </Text>
                </View>

                {/* Screens crack, brightness dies, gates are in the rain. */}
                <Text style={[T.small, { textAlign: 'center', fontSize: 12 }]}>{t('passSpoken')}</Text>
                <Text style={[T.small, { textAlign: 'center' }]}>{t('passNote', { name: CHILD })}</Text>

                <View style={{ flexDirection: 'row', gap: S.xl, alignSelf: 'stretch', paddingTop: S.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={T.label}>{t('queue')}</Text>
                    <Text style={{ fontFamily: F.monoSemi, fontSize: 20, color: C.ink, marginTop: 2 }}>
                      #12 / 34
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={T.label}>{t('wait')}</Text>
                    <Text style={{ fontFamily: F.monoSemi, fontSize: 20, color: C.ink, marginTop: 2 }}>
                      18 min
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Button title={t('checkInAction', { name: CHILD })} onPress={() => setOnTheWay(true)} />
            )}
          </View>
        ) : null}

        <Text style={[T.small, { fontSize: 12, textAlign: 'center', marginTop: S.xl }]}>{t('trust')}</Text>
      </ScrollView>

      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('language')} maxHeight="56%">
        <View style={{ gap: S.sm }}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              accessibilityRole="button"
              accessibilityState={{ selected: lang.code === l.code }}
              onPress={() => {
                setLang(l);
                setLangOpen(false);
              }}
              style={{
                minHeight: 56,
                justifyContent: 'center',
                paddingHorizontal: S.lg,
                borderRadius: R.card,
                borderWidth: 1,
                borderColor: lang.code === l.code ? C.accent : C.rule,
                backgroundColor: C.card,
              }}
            >
              <Text style={{ fontFamily: F.uiMed, fontSize: 15, color: C.ink }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

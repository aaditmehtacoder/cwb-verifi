import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
} from '@expo-google-fonts/archivo';
import { SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';

import { C, F, S } from './src/theme';
import { VerifiProvider, useVerifi } from './src/store';
import Notice from './src/components/Notice';
import Icon from './src/components/Icon';
import Logo from './src/components/Logo';
import { Check } from './src/components/ui';
import ChatButton from './src/components/ChatButton';
import Splash from './src/screens/Splash';
import Onboarding from './src/screens/Onboarding';
import Home from './src/screens/Home';
import Scan from './src/screens/Scan';
import SignIn from './src/screens/SignIn';
import Chat from './src/screens/Chat';
import Record from './src/screens/Record';
import Teacher from './src/screens/Teacher';
import Student from './src/screens/Student';
import Parent from './src/screens/Parent';
import Admin from './src/screens/Admin';
import AllClear from './src/screens/AllClear';

const SCREENS = {
  splash: { component: Splash, label: 'Verifi', bare: true },
  onboarding: { component: Onboarding, label: 'Verifi', bare: true },
  home: { component: Home, label: 'Verifi' },
  scan: { component: Scan, label: 'Scan' },
  signin: { component: SignIn, label: 'Sign in' },
  chat: { component: Chat, label: 'Messages' },
  record: { component: Record, label: 'Sweep' },
  teacher: { component: Teacher, label: 'Teacher' },
  student: { component: Student, label: 'Student' },
  parent: { component: Parent, label: 'Parent' },
  admin: { component: Admin, label: 'Admin' },
  allclear: { component: AllClear, label: 'All clear' },
};

// The bar across the top of every screen: who this is, what kind of event is
// running, and how many students a person has confirmed so far. It is the one
// thing on screen at all times, so it says only what someone would actually
// want at a glance.
function EventBar({ route, navigate }) {
  const { mode, counts, live } = useVerifi();
  const isHome = route === 'home';
  const open = counts.pending;
  const done = counts.verified;
  const total = done + open;
  const clear = open === 0 && total > 0;

  return (
    <View
      style={{
        height: 44,
        backgroundColor: C.accent,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 14,
        paddingRight: 8,
        gap: 10,
      }}
    >
      <Pressable
        onPress={() => navigate('home')}
        accessibilityRole="button"
        accessibilityLabel="Home"
        hitSlop={10}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Logo size={26} mono="#FFFFFF" />
        {isHome ? null : (
          <Text style={{ fontFamily: F.uiSemi, fontSize: 13, color: '#FFFFFF' }}>Verifi</Text>
        )}
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: F.uiSemi,
            fontSize: 10,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            opacity: 0.9,
          }}
        >
          {mode === 'drill' ? 'Drill in progress' : 'Live event'}
        </Text>
        <Text style={{ fontFamily: F.mono, fontSize: 10, color: '#FFFFFF', opacity: 0.6 }}>
          {live ? 'shared board' : 'this phone'} · {SCREENS[route].label}
        </Text>
      </View>

      {/* The count, and a check the moment nobody is left open. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: clear ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)',
        }}
      >
        {clear ? (
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={9} color={C.accent} />
          </View>
        ) : (
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.pending }} />
        )}
        <Text style={{ fontFamily: F.monoSemi, fontSize: 12, color: '#FFFFFF' }}>
          {done}
          <Text style={{ fontFamily: F.mono, opacity: 0.65 }}>/{total}</Text>
        </Text>
      </View>
    </View>
  );
}

function Shell() {
  const [route, setRoute] = useState('splash');
  const navigate = useCallback((next) => setRoute(next), []);
  const { component: Screen, bare } = SCREENS[route];
  const { notice, clearNotice } = useVerifi();
  // The splash is the one accent-filled screen; the safe area matches it.
  const surface = route === 'splash' ? C.accent : C.paper;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface }} edges={['top', 'bottom']}>
      {bare ? null : <EventBar route={route} navigate={navigate} />}
      <View style={{ flex: 1 }}>
        <Screen navigate={navigate} />
        {/* Above every screen: what just happened elsewhere in the building. */}
        <Notice
          notice={notice}
          onDismiss={clearNotice}
          onPress={() => {
            clearNotice();
            navigate('admin');
          }}
        />
        {bare || route === 'chat' ? null : <ChatButton onPress={() => navigate('chat')} />}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  }

  const app = (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.accent} />
      <VerifiProvider>
        <Shell />
      </VerifiProvider>
    </SafeAreaProvider>
  );

  // On web, render inside a 390 × 844 phone frame so the prototype reads as a phone.
  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          flex: 1,
          minHeight: '100%',
          backgroundColor: '#E7EAE9',
          alignItems: 'center',
          justifyContent: 'center',
          padding: S.xl,
        }}
      >
        <View style={{ backgroundColor: C.ink, padding: 11, borderRadius: 46 }}>
          <View style={{ width: 390, height: 844, borderRadius: 35, overflow: 'hidden', backgroundColor: C.paper }}>
            {app}
          </View>
        </View>
      </View>
    );
  }

  return app;
}

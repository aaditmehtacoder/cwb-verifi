import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C, F, R, S, T } from '../theme';
import { Button, Glass, Rule } from '../components/ui';
import Icon from '../components/Icon';
import { AppleMark, GoogleMark, MicrosoftMark } from '../components/marks';
import Logo from '../components/Logo';
import {
  PROVIDERS,
  createAccount,
  enabledProviders,
  isConfigured,
  signInWithPassword,
  signInWithProvider,
} from '../supabase';
import { useVerifi } from '../store';

const MARKS = {
  google: GoogleMark,
  azure: MicrosoftMark,
  apple: AppleMark,
};

function Field({ icon, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize, onSubmitEditing }) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.md,
        minHeight: 58,
        paddingHorizontal: S.lg,
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: focused ? C.accent : 'rgba(255,255,255,0.9)',
        backgroundColor: focused ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
      }}
    >
      <Icon name={icon} size={19} color={focused ? C.accent : C.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.absent}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        style={{ flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink, paddingVertical: S.md }}
      />
    </View>
  );
}

/**
 * One row per identity provider.
 *
 * A district runs on Google Workspace or on Entra ID, almost never on both, and
 * the teacher holding the phone knows which button has their face on it without
 * being told. So all three are shown at equal weight rather than one being
 * promoted: guessing wrong costs more than the row of space costs.
 *
 * `live` is what the Supabase project actually has switched on, read from the
 * project's own settings rather than assumed. A provider that is off is still
 * shown, dimmed, saying so — because the person who needs to know is the person
 * setting the demo up, and hiding it tells them nothing.
 */
function ProviderRow({ provider, live, busy, onPress }) {
  const Mark = MARKS[provider.id];
  const off = live !== null && !live;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${provider.label}`}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: 'rgba(255,255,255,0.82)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: S.lg,
        gap: S.md,
        shadowColor: '#0B1C22',
        shadowOpacity: pressed ? 0.04 : 0.07,
        shadowRadius: pressed ? 6 : 12,
        shadowOffset: { width: 0, height: pressed ? 1 : 4 },
        elevation: pressed ? 1 : 3,
        opacity: busy ? 0.5 : pressed ? 0.92 : 1,
      })}
    >
      <Mark size={20} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>
          Continue with {provider.label}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: F.ui, fontSize: 11, color: off ? C.pending : C.inkSoft, marginTop: 1 }}
        >
          {off ? 'Not switched on for this project yet' : provider.note}
        </Text>
      </View>
      {off ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.absent }} /> : null}
    </Pressable>
  );
}

export default function SignIn({ navigate }) {
  const { setUser, staffName } = useVerifi();
  const [mode, setMode] = useState('in'); // in | up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  // null until we have heard back, so nothing is labelled "off" merely because
  // the answer has not arrived.
  const [live, setLive] = useState(null);

  useEffect(() => {
    if (!isConfigured()) return;
    enabledProviders().then(setLive);
  }, []);

  const ready = email.includes('@') && password.length >= 6;

  const arrive = (r) => {
    if (r.ok) {
      setUser(r.user);
      navigate('home');
    } else {
      setNote(r.reason);
      if (r.needsConfirmation) setMode('in');
    }
  };

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setNote(null);
    const r = mode === 'in' ? await signInWithPassword(email, password) : await createAccount(email, password);
    setBusy(false);
    arrive(r);
  };

  const withProvider = async (id) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const r = await signInWithProvider(id);
    setBusy(false);
    if (r.reason === 'Cancelled.') return; // a person changing their mind is not an error
    arrive(r);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: S.xl, paddingTop: S.xl, paddingBottom: S.xxl, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <Logo size={68} />
        </View>

        <Text style={[T.title, { textAlign: 'center', marginTop: S.lg }]}>
          {mode === 'in' ? 'Sign in' : 'Create an account'}
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 16,
            lineHeight: 24,
            color: C.inkSoft,
            textAlign: 'center',
            marginTop: S.sm,
          }}
        >
          Every student you confirm carries your name.
        </Text>

        {/* The providers first. Almost nobody at a school types a password. */}
        <View style={{ marginTop: S.xl, gap: S.sm }}>
          {PROVIDERS.map((p) => (
            <ProviderRow
              key={p.id}
              provider={p}
              live={live === null ? null : live.includes(p.id)}
              busy={busy}
              onPress={() => withProvider(p.id)}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginVertical: S.lg }}>
          <Rule style={{ flex: 1 }} />
          <Text style={[T.label, { fontSize: 10 }]}>or with an email</Text>
          <Rule style={{ flex: 1 }} />
        </View>

        <Glass intensity={26} style={{ borderRadius: R.card, padding: S.lg, gap: S.md }}>
          <Field
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            keyboardType="email-address"
          />
          <Field
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secure
            onSubmitEditing={submit}
          />

          <Button
            title={busy ? 'Working' : mode === 'in' ? 'Sign in' : 'Create account'}
            onPress={submit}
            disabled={!ready || busy}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setNote(null);
            }}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontFamily: F.uiMed, fontSize: 13, color: C.accent }}>
              {mode === 'in' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </Glass>

        {/* Whatever went wrong, said plainly, with the fix where there is one. */}
        {note ? (
          <View
            style={{
              marginTop: S.md,
              backgroundColor: 'rgba(185,133,36,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(185,133,36,0.24)',
              borderRadius: R.small,
              padding: S.md,
            }}
          >
            <Text style={[T.small, { color: C.ink }]}>{note}</Text>
            {/not switched on/i.test(note) ? (
              <Text style={[T.small, { marginTop: S.xs }]}>
                Supabase dashboard → Authentication → Sign In / Providers. Google and Apple need a client
                ID and secret from their own consoles; Microsoft needs an app registration in Entra ID.
              </Text>
            ) : null}
            {/confirm/i.test(note) ? (
              <Text style={[T.small, { marginTop: S.xs }]}>
                To skip confirmation during a drill: Supabase dashboard → Authentication → Sign In → Email,
                turn off Confirm email.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: S.lg }} />

        <Button
          title="Continue without signing in"
          variant="quiet"
          style={{ marginTop: S.lg }}
          onPress={() => navigate('home')}
        />
        <Text style={[T.small, { textAlign: 'center', marginTop: S.xs }]}>
          Confirmations are recorded as {staffName} until you sign in.
        </Text>

        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.inkSoft,
            textAlign: 'center',
            marginTop: S.lg,
          }}
        >
          {!isConfigured()
            ? 'no board connected · this phone only'
            : live === null
            ? 'checking which sign in methods are on'
            : `on: ${['email', ...live].join(', ')}`}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

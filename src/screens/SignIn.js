import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C, F, R, S, T, cardStyle } from '../theme';
import { Button, Rule } from '../components/ui';
import Icon from '../components/Icon';
import GoogleG from '../components/GoogleG';
import Logo from '../components/Logo';
import { createAccount, enabledProviders, isConfigured, signInWithGoogle, signInWithPassword } from '../supabase';
import { useVerifi } from '../store';

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
        borderColor: focused ? C.accent : C.rule,
        backgroundColor: C.card,
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

export default function SignIn({ navigate }) {
  const { setUser, staffName } = useVerifi();
  const [mode, setMode] = useState('in'); // in | up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (isConfigured()) enabledProviders().then(setProviders);
  }, []);

  const ready = email.includes('@') && password.length >= 6;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setNote(null);
    const r = mode === 'in' ? await signInWithPassword(email, password) : await createAccount(email, password);
    setBusy(false);
    if (r.ok) {
      setUser(r.user);
      navigate('home');
    } else {
      setNote(r.reason);
      if (r.needsConfirmation) setMode('in');
    }
  };

  const google = async () => {
    setBusy(true);
    setNote(null);
    const r = await signInWithGoogle();
    setBusy(false);
    if (r.ok) {
      setUser(r.user);
      navigate('home');
    } else {
      setNote(r.reason);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingTop: S.xxl, paddingBottom: S.xxl, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <Logo size={76} />
        </View>

        <Text style={[T.title, { textAlign: 'center', marginTop: S.lg }]}>
          {mode === 'in' ? 'Staff sign in' : 'Create a staff account'}
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

        <View style={[cardStyle, { marginTop: S.xl, padding: S.lg, gap: S.md }]}>
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

          {note ? (
            <View style={{ backgroundColor: 'rgba(185,133,36,0.09)', borderRadius: 10, padding: S.md }}>
              <Text style={[T.small, { color: C.ink }]}>{note}</Text>
              {/provider is not|not switched on/i.test(note) ? (
                <Text style={[T.small, { marginTop: S.xs }]}>
                  Supabase dashboard, Authentication, Providers, Google.
                </Text>
              ) : null}
              {/confirm/i.test(note) ? (
                <Text style={[T.small, { marginTop: S.xs }]}>
                  To skip confirmation during a drill: Supabase dashboard, Authentication, Sign In, Email,
                  turn off Confirm email.
                </Text>
              ) : null}
            </View>
          ) : null}

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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Rule style={{ flex: 1 }} />
            <Text style={[T.label, { fontSize: 10 }]}>or</Text>
            <Rule style={{ flex: 1 }} />
          </View>

          <Pressable
            onPress={google}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 56,
              borderRadius: R.card,
              borderWidth: 1,
              borderColor: C.rule,
              backgroundColor: C.card,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: S.md,
              opacity: busy ? 0.5 : pressed ? 0.9 : 1,
            })}
          >
            <GoogleG size={19} />
            <Text style={{ fontFamily: F.uiSemi, fontSize: 15, color: C.ink }}>Continue with Google</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

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
          sign in methods on: {providers.length ? providers.join(', ') : 'email'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

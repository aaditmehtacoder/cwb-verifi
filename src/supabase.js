/**
 * The shared board.
 *
 * Without Supabase the app is still complete, every phone just keeps its own
 * copy of the event. With it, one phone confirming a student moves the tile on
 * every other phone in the room, which is the whole point during a real event.
 *
 * Everything here degrades honestly: if the keys are missing, the tables are not
 * created yet, or the network is down, the app says so in plain language and
 * keeps working on device.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const isConfigured = () => URL.startsWith('http') && KEY.length > 20;

export const supabase = isConfigured()
  ? createClient(URL, KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

/** Human-readable reason the board is not live, or null when it is. */
export async function boardStatus() {
  if (!isConfigured()) return 'not configured';
  try {
    const { error } = await supabase.from('students').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205') return 'tables not created yet';
      return error.message;
    }
    return null;
  } catch {
    return 'offline';
  }
}

export async function fetchStudents() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('students')
    .select('id,name,initials,cluster,status,confirmed_by,confirmed_at,place,lat,lon,accuracy')
    .order('id');
  if (error) return null;
  return data;
}

/** A person confirmed a student. This is the only write that changes a status. */
export async function pushConfirmation(studentId, staffName, where = {}) {
  if (!supabase) return { ok: false, reason: 'not configured' };
  const { fix, place } = where;
  const { error } = await supabase
    .from('students')
    .update({
      status: 'verified',
      confirmed_by: staffName,
      confirmed_at: new Date().toISOString(),
      place: place || null,
      lat: fix?.lat ?? null,
      lon: fix?.lon ?? null,
      accuracy: fix?.accuracy ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function logScan(studentId, staffName, code, fix) {
  if (!supabase) return;
  await supabase.from('scans').insert({
    student_id: studentId,
    scanned_by: staffName,
    code,
    lat: fix?.lat ?? null,
    lon: fix?.lon ?? null,
  });
}

/** Live status changes from any other phone. Returns an unsubscribe function. */
export function subscribeToBoard(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('board')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, (payload) => {
      onChange(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Put the board back to 99 verified / 1 pending for the next run-through. */
export async function resetBoard() {
  if (!supabase) return { ok: false };
  const { error } = await supabase.rpc('noop').then(
    () => ({ error: null }),
    () => ({ error: null })
  );
  const { error: e2 } = await supabase
    .from('students')
    .update({ status: 'pending', confirmed_by: null, confirmed_at: null })
    .eq('name', 'Maya Reyes');
  return { ok: !error && !e2 };
}

// ── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(limit = 60) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('messages')
    .select('id,author,role,body,place,created_at')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return null;
  return data;
}

export async function sendMessage({ author, role = 'staff', body, place }) {
  if (!supabase) return { ok: false, reason: 'not configured' };
  const { data, error } = await supabase
    .from('messages')
    .insert({ author, role, body, place: place || null })
    .select()
    .single();
  if (error) return { ok: false, reason: error.message };
  return { ok: true, message: data };
}

/** New messages from any other phone. Returns an unsubscribe function. */
export function subscribeToMessages(onMessage) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      onMessage(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Which sign-in methods this project actually has switched on. */
export async function enabledProviders() {
  if (!isConfigured()) return [];
  try {
    const res = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } });
    const json = await res.json();
    return Object.entries(json.external || {})
      .filter(([, on]) => on)
      .map(([name]) => name);
  } catch {
    return [];
  }
}

export async function signInWithGoogle() {
  if (!supabase) return { ok: false, reason: 'Supabase is not configured' };

  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) {
    return {
      ok: false,
      reason: /provider is not enabled/i.test(error.message)
        ? 'Google is not switched on for this Supabase project yet'
        : error.message,
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { ok: false, reason: 'cancelled' };

  // Supabase returns the session in the URL fragment.
  const params = new URLSearchParams(result.url.split('#')[1] || '');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token) return { ok: false, reason: 'no session returned' };

  const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
  if (setErr) return { ok: false, reason: setErr.message };

  const { data: userData } = await supabase.auth.getUser();
  return { ok: true, user: userData?.user || null };
}

/** Email and password, the method this project has switched on today. */
export async function signInWithPassword(email, password) {
  if (!supabase) return { ok: false, reason: 'Supabase is not configured' };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    const m = error.message || '';
    if (/email not confirmed/i.test(m)) {
      return { ok: false, reason: 'That account still needs its email confirmed.' };
    }
    if (/invalid login/i.test(m)) {
      return { ok: false, reason: 'That email and password do not match an account.' };
    }
    return { ok: false, reason: m };
  }
  return { ok: true, user: data.user };
}

export async function createAccount(email, password) {
  if (!supabase) return { ok: false, reason: 'Supabase is not configured' };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) {
    const m = error.message || '';
    if (/at least/i.test(m)) return { ok: false, reason: 'Use at least six characters for the password.' };
    if (/already registered/i.test(m)) return { ok: false, reason: 'That email already has an account. Sign in instead.' };
    return { ok: false, reason: m };
  }
  // Projects that require email confirmation return a user with no session.
  if (!data.session) {
    return { ok: false, needsConfirmation: true, reason: 'Account made. Confirm it from the email we just sent, then sign in.' };
  }
  return { ok: true, user: data.user };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function staffNameFrom(user) {
  if (!user) return 'Staff';
  const meta = user.user_metadata || {};
  const full = meta.full_name || meta.name || user.email || 'Staff';
  const parts = String(full).split(/[\s@]+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0].toUpperCase()}. ${parts[1]}` : parts[0];
}

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

// Copied out of the Supabase dashboard, the project URL often carries a
// trailing slash. Left alone it turns every hand-built path into a double
// slash, which the auth settings endpoint below rejects, and the symptom is a
// sign-in screen that reports no providers at all rather than an error. One
// character, so it is stripped once, here.
const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const KEY = (process.env.EXPO_PUBLIC_SUPABASE_KEY || '').trim();

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

/**
 * Human-readable reason the board is not live, or null when it is.
 *
 * It asks for the columns the app actually writes, not just for the table.
 * A project still carrying an older schema answers a `select id` perfectly
 * happily and then silently rejects every confirmation, which is the worst
 * possible failure: a room full of people watching a count that is not moving
 * and an app insisting it is connected. Better to say so on the home screen.
 */
export async function boardStatus() {
  if (!isConfigured()) return 'not configured';
  try {
    const { error } = await supabase.from('students').select(STUDENT_COLUMNS).limit(1);
    if (error) {
      if (error.code === 'PGRST205') return 'tables not created yet, run npm run db:reset';
      if (error.code === '42703' || /column .* does not exist/i.test(error.message || '')) {
        return 'board is on an older schema, run npm run db:reset';
      }
      return error.message;
    }
    return null;
  } catch {
    return 'offline';
  }
}

const STUDENT_COLUMNS =
  'id,name,initials,cluster,grade,code,guardian_code,status,confirmed_by,confirmed_at,method,place,lat,lon,accuracy';

export async function fetchStudents() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('students').select(STUDENT_COLUMNS).order('id');
  if (error) return null;
  return data;
}

/**
 * Find a student by name, against the board rather than this phone's copy.
 *
 * This is the path taken when a student has no phone, which during a real event
 * is a large minority of them. A staff member types what they heard, so the
 * match has to be forgiving: partial, unanchored, case-blind. Postgres does the
 * work because the answer has to include students this phone never loaded.
 */
export async function searchStudents(term) {
  if (!supabase) return null;
  const q = String(term || '').trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(12);
  if (error) return null;
  return data;
}

/** The single row behind a code somebody recited. */
export async function studentByCode(code) {
  if (!supabase) return null;
  const digits = String(code || '').replace(/\D/g, '');
  if (digits.length !== 6) return null;
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .eq('code', digits)
    .limit(1);
  if (error) return null;
  return data?.[0] || null;
}

/** A person confirmed a student. This is the only write that changes a status. */
export async function pushConfirmation(studentId, staffName, where = {}) {
  if (!supabase) return { ok: false, reason: 'not configured' };
  const { fix, place, method } = where;
  const { error } = await supabase
    .from('students')
    .update({
      status: 'verified',
      confirmed_by: staffName,
      confirmed_at: new Date().toISOString(),
      method: method || null,
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

export async function logScan(studentId, staffName, code, fix, method) {
  if (!supabase) return;
  await supabase.from('scans').insert({
    student_id: studentId,
    scanned_by: staffName,
    code,
    method: method || null,
    lat: fix?.lat ?? null,
    lon: fix?.lon ?? null,
  });
}

// ── Reunification ────────────────────────────────────────────────────────────

/** The adults allowed to collect this student. */
export async function fetchGuardians(studentId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('guardians')
    .select('id,student_id,name,relation,phone')
    .eq('student_id', studentId);
  if (error) return null;
  return data;
}

/**
 * A student released to a guardian at the gate.
 *
 * Two writes, deliberately. The status moves so the board stops counting them
 * as on campus, and a row lands in `reunifications` that says which adult took
 * them and which member of staff handed them over. The second one is the record
 * that matters afterwards, and it is the one a status field alone cannot keep.
 */
export async function pushReunification({ studentId, guardianName, releasedBy, passCode }) {
  if (!supabase) return { ok: false, reason: 'not configured' };
  const { error } = await supabase
    .from('students')
    .update({
      status: 'reunified',
      confirmed_by: releasedBy,
      confirmed_at: new Date().toISOString(),
      method: 'guardian',
      place: 'Gate B, reunification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);
  if (error) return { ok: false, reason: error.message };

  await supabase.from('reunifications').insert({
    student_id: studentId,
    guardian_name: guardianName,
    released_by: releasedBy,
    pass_code: passCode || null,
  });
  return { ok: true };
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

// Each room was counted by the teacher who holds it. Restoring that, rather
// than leaving ninety-nine rows with an empty confirmer, is the difference
// between a board that reads as real and one that reads as seeded.
const HELD_BY = {
  Chemistry: 'T. Whitfield',
  Gym: 'D. Okonjo',
  Library: 'L. Marchetti',
  'Room 204': 'K. Ansel',
  Cafeteria: 'P. Whitcomb',
};

/**
 * Put the shared board back to its opening position, from inside the app.
 *
 * 99 confirmed, Maya Reyes the one open case, six absent before the event, an
 * empty thread. This exists so a demo can be given twice in a row without
 * anyone opening a terminal between takes, which is a thing that happens and
 * which nobody ever plans for.
 *
 * It moves rows only. `npm run db:reset` is the one that rebuilds the schema.
 */
export async function resetBoard() {
  if (!supabase) return { ok: false, reason: 'not configured' };
  const at = new Date().toISOString();
  const clean = { place: null, lat: null, lon: null, accuracy: null };

  for (const [cluster, teacher] of Object.entries(HELD_BY)) {
    const { error } = await supabase
      .from('students')
      .update({
        status: 'verified',
        confirmed_by: teacher,
        confirmed_at: at,
        method: 'roster',
        place: cluster,
        lat: null,
        lon: null,
        accuracy: null,
        updated_at: at,
      })
      .eq('cluster', cluster);
    if (error) return { ok: false, reason: error.message };
  }

  await supabase
    .from('students')
    .update({ status: 'absent', confirmed_by: null, confirmed_at: null, method: null, ...clean, updated_at: at })
    .eq('cluster', 'Absent');

  // Maya Reyes is the one the field is waiting on. She is the whole demo.
  const { error } = await supabase
    .from('students')
    .update({ status: 'pending', confirmed_by: null, confirmed_at: null, method: null, ...clean, updated_at: at })
    .eq('name', 'Maya Reyes');
  if (error) return { ok: false, reason: error.message };

  await supabase.from('messages').delete().gt('id', 0);
  await supabase.from('scans').delete().gt('id', 0);
  await supabase.from('reunifications').delete().gt('id', 0);
  return { ok: true };
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

/**
 * The three ways in, in the order a school district actually has them.
 *
 * `id` is what Supabase calls the provider; `label` is what a person calls it.
 * Microsoft is `azure` in Supabase and Entra ID in a district's IT department
 * and Microsoft on the button, which is three names for one thing and exactly
 * the sort of detail that wastes ten minutes at a sign-in screen.
 */
export const PROVIDERS = [
  { id: 'google', label: 'Google', note: 'Google Workspace for Education' },
  { id: 'azure', label: 'Microsoft', note: 'Entra ID, formerly Azure AD' },
  { id: 'apple', label: 'Apple', note: 'Sign in with Apple' },
];

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

/**
 * Sign in through an identity provider.
 *
 * The same browser round trip for all three: Supabase mints an authorise URL,
 * the system browser handles it, and the session comes back in the fragment of
 * the redirect. Doing it in the system browser rather than a webview is what
 * lets a teacher's existing district session carry them straight through, and
 * it is what Google requires.
 *
 * A provider that is not switched on in the dashboard fails here with a
 * specific message rather than a generic one, because the fix is a checkbox and
 * whoever is holding the phone should be told which checkbox.
 */
export async function signInWithProvider(provider) {
  if (!supabase) return { ok: false, reason: 'Supabase is not configured' };

  const known = PROVIDERS.find((p) => p.id === provider);
  const label = known?.label || provider;

  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) {
    return {
      ok: false,
      provider,
      reason: /provider is not enabled/i.test(error.message)
        ? `${label} is not switched on for this Supabase project yet.`
        : error.message,
      needsDashboard: /provider is not enabled/i.test(error.message),
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { ok: false, provider, reason: 'Cancelled.' };

  // Supabase returns the session in the URL fragment. Some providers return an
  // error there too, and saying which is better than saying "no session".
  const fragment = new URLSearchParams(result.url.split('#')[1] || '');
  const query = new URLSearchParams(result.url.split('?')[1]?.split('#')[0] || '');
  const described = fragment.get('error_description') || query.get('error_description');
  if (described) return { ok: false, provider, reason: described.replace(/\+/g, ' ') };

  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!access_token) return { ok: false, provider, reason: `${label} returned no session.` };

  const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
  if (setErr) return { ok: false, provider, reason: setErr.message };

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

#!/usr/bin/env node
/**
 * Put the shared board back to its opening position.
 *
 *   npm run reset
 *
 * 99 confirmed, Maya Reyes the single open case, six marked absent before the
 * event, no stale confirmer, no stale location, and an empty thread. Safe to
 * run between demo runs, and safe to run twice.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!URL || !KEY) {
  console.log('\n  No Supabase keys in .env, so there is no shared board to reset.\n');
  process.exit(0);
}

const call = async (method, pathAndQuery, body) => {
  const res = await fetch(`${URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
};

const count = async (query) => {
  const res = await fetch(`${URL}/rest/v1/students?select=id&${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  return (await res.json()).length;
};

(async () => {
  const clean = {
    confirmed_by: null,
    confirmed_at: null,
    place: null,
    lat: null,
    lon: null,
    accuracy: null,
  };

  await call('PATCH', 'students?cluster=neq.Absent', { status: 'verified', ...clean });
  await call('PATCH', 'students?cluster=eq.Absent', { status: 'absent', ...clean });
  await call('PATCH', 'students?name=eq.Maya%20Reyes', { status: 'pending', ...clean });
  const messages = await call('DELETE', 'messages?id=gt.0');
  await call('DELETE', 'scans?id=gt.0');

  const verified = await count('status=eq.verified');
  const pending = await count('status=eq.pending');
  const absent = await count('status=eq.absent');

  console.log('\n  Board reset\n');
  console.log(`    ${verified} confirmed by a person`);
  console.log(`    ${pending} open        (Maya Reyes, Chemistry)`);
  console.log(`    ${absent} absent      before the event`);
  console.log(
    `    thread      ${messages === 404 ? 'no messages table yet, run supabase/messages.sql' : 'cleared'}`
  );
  console.log('\n  Ready to demo.\n');
})();

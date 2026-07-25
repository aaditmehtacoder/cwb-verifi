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

// Each room was counted by the teacher who holds it. Restoring that, rather
// than leaving 99 rows with an empty confirmer, is the difference between a
// board that reads as real and one that reads as seeded.
const HELD_BY = {
  Chemistry: 'T. Whitfield',
  Gym: 'D. Okonjo',
  Library: 'L. Marchetti',
  'Room 204': 'K. Ansel',
  Cafeteria: 'P. Whitcomb',
};

(async () => {
  const clean = { place: null, lat: null, lon: null, accuracy: null };

  for (const [cluster, teacher] of Object.entries(HELD_BY)) {
    await call('PATCH', `students?cluster=eq.${encodeURIComponent(cluster)}`, {
      status: 'verified',
      confirmed_by: teacher,
      confirmed_at: new Date().toISOString(),
      method: 'roster',
      place: cluster,
      lat: null,
      lon: null,
      accuracy: null,
    });
  }

  await call('PATCH', 'students?cluster=eq.Absent', {
    status: 'absent',
    confirmed_by: null,
    confirmed_at: null,
    method: null,
    ...clean,
  });

  // Maya Reyes is the one the field is waiting on. She is the whole demo.
  await call('PATCH', 'students?name=eq.Maya%20Reyes', {
    status: 'pending',
    confirmed_by: null,
    confirmed_at: null,
    method: null,
    ...clean,
  });

  const messages = await call('DELETE', 'messages?id=gt.0');
  await call('DELETE', 'scans?id=gt.0');
  await call('DELETE', 'reunifications?id=gt.0');

  const verified = await count('status=eq.verified');
  const pending = await count('status=eq.pending');
  const absent = await count('status=eq.absent');

  console.log('\n  Board reset\n');
  console.log(`    ${verified} confirmed by a person`);
  console.log(`    ${pending} open        (Maya Reyes, Chemistry)`);
  console.log(`    ${absent} absent      before the event`);
  console.log(
    `    thread      ${messages === 404 ? 'no messages table yet, run npm run db:reset' : 'cleared'}`
  );
  console.log('\n  Ready to demo.\n');
})();

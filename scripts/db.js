#!/usr/bin/env node
/**
 * Build the shared board from nothing.
 *
 *   npm run db:reset
 *
 * Applies supabase/schema.sql, which drops every Verifi table and creates them
 * again. Destructive by design: it is the only way to be certain the board is
 * in its opening position rather than in whatever state the last run-through
 * left it, and a demo you cannot reset is a demo you get one take at.
 *
 * Needs a direct Postgres connection, because dropping and creating tables is
 * not something the REST API can do. Supabase dashboard → Project Settings →
 * Database → Connection string → URI. Paste it into .env as:
 *
 *   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
 *
 * If you would rather not put the database password on disk, the same file
 * pastes straight into the dashboard SQL editor and does exactly the same
 * thing. Use `npm run reset` between takes; that one only moves rows back and
 * needs nothing but the keys the app already has.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// .env is not machine-readable to Node on its own, and this script runs before
// anything that would load it.
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const DB_URL = process.env.SUPABASE_DB_URL;
const SQL_PATH = path.join(root, 'supabase', 'schema.sql');

function bail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!DB_URL) {
  bail(
    [
      'No SUPABASE_DB_URL in .env, so there is no database to build.',
      '',
      '  Supabase dashboard → Project Settings → Database → Connection string → URI',
      '  Add it to .env as SUPABASE_DB_URL=postgresql://...',
      '',
      '  Or paste supabase/schema.sql into the dashboard SQL editor, which does',
      '  the same thing and needs no password on disk.',
    ].join('\n  ')
  );
}

let Client;
try {
  ({ Client } = require('pg'));
} catch {
  bail('The pg driver is missing. Run: npm install');
}

(async () => {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  // Supabase terminates unencrypted connections; the pooler presents a cert
  // signed by an authority Node does not ship, which is a transport concern
  // and not an authentication one.
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  console.log('\n  Connecting…');
  try {
    await client.connect();
  } catch (e) {
    bail(`Could not connect: ${e.message}`);
  }

  console.log('  Dropping and rebuilding every Verifi table…');
  try {
    await client.query(sql);
  } catch (e) {
    await client.end().catch(() => {});
    bail(`SQL failed: ${e.message}`);
  }

  const counts = await client.query(
    'select status, count(*)::int as n from public.students group by status order by status'
  );
  const maya = await client.query(
    "select code, guardian_code from public.students where name = 'Maya Reyes'"
  );
  const guardians = await client.query('select count(*)::int as n from public.guardians');

  await client.end();

  const by = Object.fromEntries(counts.rows.map((r) => [r.status, r.n]));
  const total = counts.rows.reduce((s, r) => s + r.n, 0);

  console.log('\n  Board built\n');
  console.log(`    ${total} students on the roster`);
  console.log(`    ${by.verified || 0} confirmed by a person`);
  console.log(`    ${by.pending || 0} open        (Maya Reyes, Chemistry)`);
  console.log(`    ${by.absent || 0} absent      before the event`);
  console.log(`    ${guardians.rows[0].n} guardians   on the pickup list`);
  console.log(`\n    Maya's code      ${maya.rows[0]?.code}   she recites this if her phone is dead`);
  console.log(`    Maya's pass code ${maya.rows[0]?.guardian_code}   her guardian shows this at the gate`);
  console.log('\n  Ready to demo.\n');
})().catch((e) => bail(e.message));

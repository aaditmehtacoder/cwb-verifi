#!/usr/bin/env node
/**
 * Checks the AI layer without burning the free-tier day.
 *
 *   npm run ai:check          guardrail tests only — no network, no quota
 *   npm run ai:check -- live  the above, plus ONE real call through the chain
 *
 * The guardrail tests are the important ones: they prove that model output
 * claiming a student is safe never reaches the screen.
 */
const fs = require('fs');
const path = require('path');

// Load .env the way Expo does, so this script sees the same key the app will.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

// src/ai.js is ESM inside a CommonJS package, so hand it to Node as .mjs and
// import it directly — no build step, and the exact file the app ships.
const os = require('os');
const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai.js'), 'utf8');
const tmp = path.join(os.tmpdir(), `verifi-ai-${process.pid}.mjs`);
fs.writeFileSync(tmp, aiSrc);

let sanitizeSuggestion, suggestWhereToLook, MODELS, hasKey, budget;

const REJECT = [
  'Maya has been verified safe by school staff.',
  'The student is safe and accounted for in the nurse office.',
  'She was found at the nurse checkpoint.',
  'Confirmed safe at 10:42.',
  'All clear — every student is accounted for.',
  'The student has been confirmed at the nurse checkpoint.',
  '',
  '   ',
];

const ACCEPT = [
  'Probable match at the nurse checkpoint; two reports agree on time and destination.',
  'Check the corridor between Chemistry and the nurse office. A staff member must verify.',
];

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  ok ? (pass += 1) : (fail += 1);
};

async function main() {
({ sanitizeSuggestion, suggestWhereToLook, MODELS, hasKey, budget } = await import('file://' + tmp));

console.log('\nGuardrail — model output that claims a confirmation must be discarded\n');
REJECT.forEach((t) =>
  check(`rejected: ${t.trim() ? `"${t.slice(0, 52)}${t.length > 52 ? '…' : ''}"` : '(empty output)'}`,
    sanitizeSuggestion(t) === null)
);

console.log('\nGuardrail — usable output passes and always ends with the human requirement\n');
ACCEPT.forEach((t) => {
  const out = sanitizeSuggestion(t);
  check(`accepted: "${t.slice(0, 46)}…"`, typeof out === 'string');
  check('  ends by requiring a person', /must verify|staff member must/i.test(out || ''));
});

console.log('\nConfig\n');
check(`key loaded from .env`, hasKey());
check(`${MODELS.length} free models in the fallback chain`, MODELS.length >= 3);
check(`per-session call budget is capped (${budget().max})`, budget().max > 0 && budget().max <= 60);

  if (process.argv.includes('live')) {
    console.log('\nLive call — one request through the chain (uses free-tier quota)\n');
    const t0 = Date.now();
    const r = await suggestWhereToLook({
      student: 'Maya Reyes',
      evidence: [
        { source: 'Morning attendance', reading: 'Present', time: '08:02' },
        { source: 'Assigned room', reading: 'Chemistry', time: '10:15' },
        { source: 'Teacher report', reading: 'Not with class', time: '10:31' },
        { source: 'Hall pass', reading: 'Sent to nurse', time: '10:24' },
        { source: 'Nurse checkpoint', reading: 'Unidentified student present', time: '10:29' },
      ],
      fallback: 'Probable match at Nurse Checkpoint. A staff member must verify.',
    });
    console.log(`  source   : ${r.source}${r.model ? ` (${r.model})` : ''}`);
    console.log(`  attempts : ${r.attempts ?? '-'}   elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (r.reason) console.log(`  reason   : ${r.reason}`);
    console.log(`  text     : ${r.text}`);
    check('returned usable text', typeof r.text === 'string' && r.text.length > 20);
    check('text does not claim a confirmation', sanitizeSuggestion(r.text) !== null);
    console.log(`  quota    : ${budget().left}/${budget().max} session calls left`);
  }

  fs.rmSync(tmp, { force: true });
  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main();

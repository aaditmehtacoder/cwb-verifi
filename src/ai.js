/**
 * The only place in Verifi that talks to a model.
 *
 * It can produce one thing: a suggestion about where a staff member should
 * look. It cannot mark a student safe, cannot change a status, and cannot
 * return anything the interface will render in the serif face. If the model
 * output reads like a confirmation, we throw it away rather than show it.
 *
 * Runs on OpenRouter's free tier, which is metered per day and throttled per
 * provider, so: a model fallback chain, a hard per-session call budget, a
 * timeout, and a cache. When all of that is exhausted the app falls back to
 * the written suggestion and says so.
 */

const KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY || '';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Ordered by how well each one held the register in testing. Reasoning models
// spend tokens before they answer, hence the generous max_tokens below.
export const MODELS = [
  'openai/gpt-oss-20b:free',
  'inclusionai/ling-3.0-flash:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
];

// Free tier is metered daily. A drill should never be able to drain it.
const MAX_CALLS = 12;
const TIMEOUT_MS = 20000;

let spent = 0;
const cache = new Map();

export const budget = () => ({ spent, max: MAX_CALLS, left: Math.max(0, MAX_CALLS - spent) });
export const hasKey = () => KEY.startsWith('sk-or-');

const SYSTEM = [
  'You help school staff during a student accountability event.',
  'You read evidence and say where a person should physically look. Nothing else.',
  'You must never state or imply that a student is safe, found, accounted for, or confirmed.',
  'Only a staff member can confirm a student. Say so explicitly in your last sentence.',
  'Two sentences maximum. Plain declarative language. No greeting, no preamble, no bullet points.',
].join(' ');

function prompt(student, evidence) {
  const rows = evidence.map((e) => `${e.source}: ${e.reading} at ${e.time}`).join('; ');
  return [
    `Student: ${student}.`,
    `Evidence: ${rows}.`,
    'Where should a staff member check, and what in the evidence supports that?',
  ].join(' ');
}

// Anything that sounds like a verdict is disqualified, the interface reserves
// that meaning for a human, and the serif face for their words.
const FORBIDDEN = [
  /\b(is|was|has been|appears?|seems?)\s+(safe|secure|accounted|located|found)\b/i,
  /\b(confirm(ed|s)?|verified)\s+(safe|present|as safe)\b/i,
  /\bstudent (is|has been) (confirmed|verified|accounted)\b/i,
  /\ball clear\b/i,
];

export function sanitizeSuggestion(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (FORBIDDEN.some((re) => re.test(t))) return null;
  if (t.length > 400) return null;
  // The rule has to survive even a well-behaved model forgetting it.
  return /must verify|verify in person|staff member must/i.test(t)
    ? t
    : `${t.replace(/\s*$/, '')} A staff member must verify.`;
}

async function callModel(model, body, signal) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://verifi.local',
      'X-Title': 'Verifi',
    },
    body: JSON.stringify({ ...body, model }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    const code = json?.error?.code || res.status;
    return { ok: false, code, message: json?.error?.message || `HTTP ${res.status}` };
  }
  return { ok: true, text: json?.choices?.[0]?.message?.content || '' };
}

/**
 * Returns { text, model, ms, attempts, source: 'model' | 'fallback', reason? }.
 * Never throws and never returns null, the caller always has something to show.
 */
export async function suggestWhereToLook({ student, evidence, fallback, force = false }) {
  const key = student;
  if (!force && cache.has(key)) return cache.get(key);

  const give = (result) => {
    cache.set(key, result);
    return result;
  };

  if (!hasKey()) {
    return give({ text: fallback, source: 'fallback', reason: 'no API key configured' });
  }
  if (spent >= MAX_CALLS) {
    return give({ text: fallback, source: 'fallback', reason: `session budget spent (${MAX_CALLS})` });
  }

  const body = {
    max_tokens: 400, // reasoning models need room before they answer
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: prompt(student, evidence) },
    ],
  };

  const started = Date.now();
  const problems = [];

  for (let i = 0; i < MODELS.length; i += 1) {
    if (spent >= MAX_CALLS) break;
    const model = MODELS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    spent += 1;

    try {
      const r = await callModel(model, body, controller.signal);
      clearTimeout(timer);

      if (!r.ok) {
        // 429 is the free tier throttling a provider, the next model is free.
        problems.push(`${model}: ${r.code}`);
        continue;
      }
      const text = sanitizeSuggestion(r.text);
      if (!text) {
        problems.push(`${model}: unusable output`);
        continue;
      }
      return give({
        text,
        model,
        ms: Date.now() - started,
        attempts: i + 1,
        source: 'model',
      });
    } catch (e) {
      clearTimeout(timer);
      problems.push(`${model}: ${e.name === 'AbortError' ? 'timeout' : 'network'}`);
    }
  }

  return give({
    text: fallback,
    source: 'fallback',
    reason: problems[0] || 'no model responded',
    attempts: problems.length,
  });
}

/**
 * The assistant in the message thread.
 *
 * It answers about the event using the counts it is handed, and it operates
 * under the same rule as everywhere else in this product: it can describe the
 * board and suggest where to look, and it can never say a student is safe.
 */
export async function answerInThread({ question, board, history = [] }) {
  const fallback =
    'I can read the board but I cannot confirm anyone. A staff member has to see the student in person.';
  if (!hasKey()) return { text: fallback, source: 'fallback', reason: 'no API key configured' };
  if (spent >= MAX_CALLS) return { text: fallback, source: 'fallback', reason: 'session budget spent' };

  const system = [
    'You are the assistant inside Verifi, a school student accountability app, during an event.',
    'You answer staff questions about the event using only the board summary you are given.',
    'You must never state or imply that a student is safe, found, or confirmed. Only a staff member can confirm.',
    'If asked to confirm or clear someone, say plainly that a person has to do it and where to look.',
    'Always answer with the actual numbers and names from the board summary. Never say you lack information: the summary you are given is the whole truth about this event.',
    'Two or three sentences. Plain language. No lists, no preamble.',
  ].join(' ');

  const context = [
    `Board: ${board.verified} confirmed by a person, ${board.pending} still open, ${board.absent} marked absent before the event.`,
    board.open?.length ? `Still open: ${board.open.join(', ')}.` : 'Nobody is open.',
    board.lastPlace ? `Most recent confirmation happened at ${board.lastPlace}.` : '',
  ].filter(Boolean).join(' ');

  const body = {
    max_tokens: 400,
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'system', content: context },
      ...history.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.role === 'assistant' ? m.body : `${m.author}: ${m.body}`,
      })),
      { role: 'user', content: question },
    ],
  };

  const started = Date.now();
  for (let i = 0; i < MODELS.length; i += 1) {
    if (spent >= MAX_CALLS) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    spent += 1;
    try {
      const r = await callModel(MODELS[i], body, controller.signal);
      clearTimeout(timer);
      if (!r.ok) continue;
      const text = sanitizeSuggestion(r.text);
      if (!text) continue;
      return { text, model: MODELS[i], ms: Date.now() - started, source: 'model' };
    } catch {
      clearTimeout(timer);
    }
  }
  return { text: fallback, source: 'fallback', reason: 'no model responded' };
}

export function resetCache() {
  cache.clear();
}

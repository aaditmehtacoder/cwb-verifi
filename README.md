# Verifi

A school accountability app for the worst day of the year: **AI helps find the
student, a human confirms the truth.** Staff scan a student code with the camera
and vouch for the person in front of them; the count moves on every phone in the
building at once. Runs on Expo with Supabase for the shared board, messages, and
sign in, and OpenRouter free models for the assistant.

## Run

```bash
cd verifi-app
npm install
cp .env.example .env    # paste an OpenRouter key, optional, see "The model" below
npm run lan             # then press i (simulator), a (Android), or w (web)
```

| command | what it does |
| --- | --- |
| `npm run lan` | dev server on 8081, local network only, works on a hotspot, needs no internet |
| `npm run tunnel` | same, plus an ngrok tunnel for phones on another network |
| `npm run qr` | detects the current IP, checks the server answers on it, opens QR codes in Preview |
| `npm run ai:check` | guardrail tests for the model layer, no network, no quota |
| `npm run ai:check -- live` | the above plus one real call through the free-model chain |

On web the app renders inside a 390 × 844 phone frame. On device it runs full-screen.

## On your phone

Both phones can scan the same code at once. Expo Go must match the project SDK (54).

**Same Wi-Fi.** `npm run lan`, then `npm run qr`. Scan the Expo Go code.

**Off your phone's hotspot**, when there is no shared Wi-Fi, or the Wi-Fi blocks
phone-to-Mac traffic:

1. Phone A: Personal Hotspot on.
2. Mac: join that hotspot.
3. Phone B: join the same hotspot.
4. `npm run qr`, the Mac's address changed (usually `172.20.10.x`), so this
   regenerates the codes for it and opens them in Preview.
5. Scan from both phones.

Stay in `lan` mode for this. In tunnel mode the dev server pins every bundle URL
to the tunnel host, so even a local QR would fetch the app over the internet.

**Different networks entirely.** `npm run tunnel`, then `npm run qr` for the
tunnel codes. The tunnel URL changes on every restart.

## The flow

```
splash → onboarding (3 slides) → role picker
         ├─ Teacher   roster, With me / Not with me, off-roster student, offline queue
         ├─ Student   one line, one button, a rotating six-digit code
         ├─ Parent    waiting, verified, or reunification, following the board
         └─ Admin     counts → accountability field → evidence → suggestion
                      → Request verification at Nurse Checkpoint
                      → nurse scan → Confirm → ALL CLEAR (99 → 100)
```

Every screen is reachable; nothing dead-ends. The event bar carries the drill badge
and a **Switch** action back to the role picker.

## Rules the code enforces

- **No red anywhere.** Ochre (`pending`) carries all urgency.
- **Serif means a person vouched for it.** Source Serif 4 appears only on human-confirmed
  statements and the all-clear. Never on AI output.
- **AI never changes a status.** The suggestion block is labelled
  `SUGGESTION, NOT A CONFIRMATION` and its only action requests a human check.
- **Declare all clear is blocked** while any student is unconfirmed.
- Parents never see a location, a map, or another student. Students see no roster or count.
- No student photographs anywhere, all art is drawn from design tokens.
- `prefers-reduced-motion` replaces the orchestrated sequences with a 200 ms fade
  (`src/motion.js`).

## The model

One screen talks to a model: the admin's **Suggestion** block, via OpenRouter's
free tier (`src/ai.js`). It reads the evidence table and says where a person
should look. That is the whole job.

Everything that keeps the product honest is enforced in code, not in the prompt:

- Output is **rejected outright** if it claims a student is safe, found,
  confirmed, or accounted for. `npm run ai:check` proves this against a list of
  bad outputs, 15 assertions, no network needed.
- Every suggestion ends by requiring a person, appended if the model forgets.
- Model text renders in Archivo under `SUGGESTION, NOT A CONFIRMATION`. It can
  never reach the serif face, which is reserved for human confirmations.
- The only button under it asks a human to go look.

Operationally, the free tier is metered per day and throttled per provider, so:
a five-model fallback chain, a 12-call per-session budget, a 20-second timeout,
and a per-student cache. The written suggestion is on screen from the first
frame and the model's line swaps in when it answers, nobody waits on a model
during an event. If everything fails the app says so in the mono line and keeps
the written text.

Without a key the app runs exactly as before, on the written suggestion.

> `EXPO_PUBLIC_*` values are inlined into the client bundle, so a key shipped
> this way is readable by anyone with the app. Fine for a local prototype;
> proxy it through a server before distributing anything.

## Layout of the code

| Path | What it holds |
| --- | --- |
| `src/theme.js` | Palette, three type faces and their jobs, spacing, card + glass surfaces |
| `src/data.js` | 106 seeded students in six clusters, evidence table, staff, templates |
| `src/store.js` | Event state: statuses, counts, the confirm sequence, drill/live mode |
| `src/components/Field.js` | The accountability field, 28 px tiles, 400 ms crossfade, one ring |
| `src/components/ui.js` | Button, Chip, Sheet (in-app, frosted), FloatingBar, Glass, Counter |
| `src/screens/` | One file per screen |
| `src/ai.js` | The only model call: free-model chain, budget, cache, guardrails |
| `scripts/qr.js` | Network detection → scannable QR codes for phones |
| `scripts/ai-check.js` | Guardrail tests for the model layer |

## Material

Floating chrome, the sheet, the teacher's sticky bar, the admin's action bar, uses
`expo-blur` over the paper surface. Reading surfaces stay flat and opaque so text
contrast never depends on what is scrolling underneath.

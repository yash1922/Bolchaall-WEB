# Bolchall V2 — Demo Script

5-minute walkthrough hitting every role and the hackathon differentiators.

## Setup (once)

```bash
pnpm install
# fill in api/.env with your MONGODB_URI (Atlas or local)
pnpm seed
pnpm dev
```

Open http://localhost:3000

Demo password for all seeded accounts: **`Bolchall@2026`**

| Role | Email | State |
|---|---|---|
| Admin | `admin@bolchall.demo` | n/a |
| Doctor (approved) | `dr.priya@bolchall.demo` | 1 patient (Alex) on roster |
| Doctor (approved) | `dr.raj@bolchall.demo` | 1 patient (Sara) on roster |
| Doctor (pending) | `dr.pending@bolchall.demo` | awaits admin approval |
| Patient (trial) | `patient.alex@bolchall.demo` | 3 days into trial, streak=3, 2 badges |
| Patient (paid) | `patient.sara@bolchall.demo` | premium, streak=12, 5 badges, 10 score history |

---

## 1. Marketing landing (~30 s)

Open `http://localhost:3000`.

- Cosmic Purple aesthetic with glass cards over a gradient mesh.
- Three feature pillars: in-browser scoring, certified therapists, gamified practice.
- **One-click demo login** card — pick any role and skip straight to the dashboard. Saves 30 seconds per role switch.

Click **Get started** for the full signup flow, or use quick demo login to jump in.

## 2. New patient signup + onboarding (~1 min)

- Pick "I'm a patient", fill in name/email/password, submit.
- Land on `/welcome` — Framer Motion stepper.
- Pick **English**, set preferred name, choose 1–2 conditions ("stroke recovery", "general practice").
- Finish — redirects to `/app` with empty-state dashboard (xp=0, streak=0).

## 3. Phoneme directory + 2D mouth diagram (~1 min)

- Click **Phonemes** in the sidebar.
- 42 phonemes grouped by category (Plosives, Fricatives, Affricates, Nasals, Approximants, Vowels, Diphthongs, plus Hindi).
- Filter by All / English / Hindi.
- Click `/sh/` → detail page shows:
  - Animated 2D SVG mouth diagram (tongue position, lip shape, voicing glow if voiced)
  - Articulation tip
  - Sample words — click to hear browser TTS
  - Place / Manner / Tongue position metadata

## 4. Exercise player + MFCC scoring + gamification reveal (~90 s)

- Back to dashboard → click **Free practice → /sh/ production — round those lips**.
- Stage indicator shows Production → Summary.
- Click "Hear it first" — TTS speaks the target word.
- Optionally rate yourself 1–5 stars (metacognition).
- Click **Start recording**. Speak the word. Hit **Stop** (or wait — auto-stops at 4s).
- AudioRecorder extracts MFCC via meyda, computes a score 0–100 (cosine similarity if a target baseline exists, else signal-quality heuristic).
- Animated score reveal pops in. Toast: **"+18 XP, +60 coins · Unlocked: First Step"**.
- **Confetti burst** + animated badge popup if a new achievement unlocks.
- Top-bar coin counter and streak flame increment live.
- Click **Next** to continue or finish to land on summary.

## 4b. Patient self-matching with a therapist (~20 s)

If the patient doesn't have a doctor yet (e.g. fresh signup):

- Sidebar → **Therapist** → "Match me with a therapist" button.
- Calls `/api/patient/auto-match` which picks the approved doctor with the smallest current roster.
- Toast confirms; doctor card appears with chat link.

## 5. Switch to therapist (~1 min)

Log out → log in as `dr.priya@bolchall.demo`.

- Doctor dashboard: 1 patient, 1 open assignment, average score, rating.
- Click **Patients** → see Alex Rivera with stats (xp, streak, condition tags).
- Click into Alex → score chart, assignment history, **Assign exercise** button.
- Click Assign → modal with the full exercise library → pick one → confirm.
- Click **Chat** → conversation list on the left, live Socket.io chat on the right.
- Type a message and hit send. (If you have the patient logged in in another browser, the message arrives instantly.)

## 6. Admin (~1 min)

Log out → log in as `admin@bolchall.demo`.

- Overview: KPI cards (total users, active/trial patients, approved doctors, MRR demo, conversion %).
- Click **Applications** → 1 pending (Dr. Sam Nair). Approve or reject.
- Click **Users** → table with role badges, suspend/reinstate buttons.

## 7. Demo Stripe upgrade (~30 s)

Log out → log in as `patient.alex@bolchall.demo` (trial expires in 2 days).

- Top-bar shows **Upgrade** button.
- Click → demo billing page → click "Upgrade — $29/mo (demo)".
- `/api/patient/upgrade-demo` flips `subscriptionStatus` to `active` with a 30-day fake expiry. **No Stripe is hit** because `BOLCHALL_DEMO_MODE=true`.
- Toast confirms; Premium badge replaces the Upgrade prompt.

---

## What the V2 prompt cut (intentional, hackathon scope)

- ❌ AI exercise generator (uses static seed exercises instead — 12 exercises across 8 phoneme classes)
- ❌ React-Three-Fiber 3D mouth (uses 2D animated SVG instead)
- ❌ WASM Whisper transcription (MFCC-only scoring)
- ❌ WebRTC video calling (Socket.io chat is the demo communication channel)
- ❌ Production Stripe (real Stripe code is wired but disabled by `BOLCHALL_DEMO_MODE=true`)

## Honest scoring caveat

The MFCC scoring works as follows:

1. Browser captures audio (WebAudio API) and extracts MFCC features in real time via `meyda`.
2. If the exercise has a `targetMfcc` baseline (not yet seeded in this build), cosine similarity → 0–100.
3. **Without a target**, scoring falls back to a signal-quality heuristic (frame count + spectral spread). It rewards clear, articulated speech but does NOT verify which word was spoken.

A production build would add either Whisper-WASM transcription or pre-recorded reference audio per exercise to lift scoring from "did you speak clearly" to "did you say the right word correctly". That's an explicit next step, not a hackathon claim.

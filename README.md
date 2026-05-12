# Bolchall V2

Hackathon-grade home-based speech therapy SaaS. Patients practice phoneme drills with browser-based MFCC scoring, therapists assign exercises and chat live, admins approve doctor applications.

## Quickstart

Requires Node 20+, pnpm 9+, and a MongoDB instance (Atlas free tier or `mongodb://localhost:27017/bolchall`).

```bash
pnpm install
cp api/.env.example api/.env       # fill in MONGODB_URI + JWT secrets
cp web/.env.example web/.env.local
pnpm seed                          # populate demo data
pnpm dev                           # web on :3000, api on :4000
```

Demo password (all seeded accounts): `Bolchall@2026`

| Role            | Email                          |
|-----------------|--------------------------------|
| Admin           | admin@bolchall.demo            |
| Doctor (approved) | dr.priya@bolchall.demo       |
| Doctor (pending)  | dr.pending@bolchall.demo     |
| Patient (trial) | patient.alex@bolchall.demo     |
| Patient (paid)  | patient.sara@bolchall.demo     |

## Stack

- **Web** — Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion + Zustand + Meyda (audio MFCC) + Socket.io-client + Recharts
- **API** — Node 20 + Express + TypeScript + Mongoose + Socket.io + Zod + JWT (HttpOnly refresh)
- **Shared** — TypeScript DTOs imported by both
- **DB** — MongoDB

## Layout

```
bol/
├── api/      # Express + Mongoose + Socket.io
├── web/      # Next.js 14 App Router
├── shared/   # cross-package TS types
└── package.json (workspace root)
```

## Demo mode

Without Stripe/Cloudinary/Resend keys, the app still runs:
- Stripe → set `BOLCHALL_DEMO_MODE=true` in `api/.env` for one-click "upgrade" that flips status without hitting Stripe
- Cloudinary → uploads disabled if keys absent
- Resend → emails logged to API console

# SiteOps AI

AI copilot for construction site reporting. SiteOps AI turns a free-form daily work log in Russian, Hebrew, or English into a structured construction report, follow-up tasks, material issues, delays, finance context, and a professional manager message.

Built for OpenAI Build Week in the Work & Productivity track.

## Problem

Construction teams often document site progress in informal voice notes, WhatsApp messages, or short daily text updates. Important operational facts are easy to miss:

- how many workers were on site;
- what work was completed;
- which floors or sections were affected;
- what materials are missing;
- why work was delayed;
- what should happen tomorrow;
- whether finance, procurement, or management needs to act.

This is especially painful on multilingual sites where foremen, managers, accountants, and workers may use Russian, Hebrew, and English.

## Solution

SiteOps AI is a native Android/iOS React Native app with a Railway backend. A user can type or dictate a daily report, attach photos, choose the site, and create a structured report. The app then produces:

- site and report date;
- worker count;
- completed work;
- floors / sections;
- work hours and payment type if stated;
- used materials;
- missing materials;
- delays and impact;
- responsible people if stated;
- possible financial impact;
- next-day tasks;
- contradictions;
- a professional Hebrew manager message;
- multilingual structured fields in English, Russian, and Hebrew.

## What works now

- Native React Native app, no Expo.
- Android and iOS project structure.
- Email/password registration and login through the cloud backend.
- Role-based access:
  - owner;
  - manager;
  - foreman;
  - accountant;
  - worker.
- Railway API backend.
- Railway PostgreSQL persistence.
- Reports sync endpoint with offline queue support in the app.
- Device token endpoint prepared for push notifications.
- GPT-5.6 structured report extraction.
- Multilingual app UI: English, Russian, Hebrew.
- Multilingual report fields: a foreman can submit in Russian while another user views structured content in English, Russian, or Hebrew.
- Text report input.
- Native speech recognition for voice input on Android/iOS.
- Manual site selection for reports.
- Photo attachment inside reports.
- Dashboard with metrics, progress, activity, checklist, photos, and team chat demo state.
- Sites / finance overview with payments and cost breakdown.
- Tasks & alerts generated from reports and manual tasks.
- CSV-style and local backup export utilities for reports and finance flows.
- Local JSON backup export.
- Offline demo fallback if the AI endpoint is unavailable.

## Live backend

```text
https://siteops-ai-api-production-c0af.up.railway.app
```

Health check:

```bash
curl https://siteops-ai-api-production-c0af.up.railway.app/health
```

Expected shape:

```json
{
  "ok": true,
  "model": "gpt-5.6-terra",
  "database": {
    "configured": true,
    "connected": true
  }
}
```

## Test accounts

These accounts are seeded into the backend database for judges:

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@siteops.ai` | `demo123` |
| Manager | `manager@siteops.ai` | `demo123` |
| Foreman | `foreman@siteops.ai` | `demo123` |
| Accountant | `accountant@siteops.ai` | `demo123` |
| Worker | `worker@siteops.ai` | `demo123` |

## Tech stack

- React Native 0.86
- TypeScript
- React Navigation
- Native Android/iOS projects
- Railway
- PostgreSQL
- Express 5
- OpenAI Responses API
- GPT-5.6 structured outputs
- OpenAI audio transcription endpoint support
- Native speech recognition via `@react-native-voice/voice`

## Repository structure

```text
.
├── android/              # Android native project
├── ios/                  # iOS native project
├── server/               # Railway Express API
├── src/
│   ├── components/       # Shared app UI
│   ├── screens/          # App tabs and auth flow
│   ├── services/         # Auth, report analysis, sync, finance, storage
│   ├── types/            # TypeScript report types
│   └── config.ts         # Backend URL
└── README.md
```

## Running the mobile app

Requirements:

- Node.js 22+
- npm
- React Native CLI environment
- Android Studio for Android
- Xcode + CocoaPods for iOS

Install:

```bash
npm install
```

Run Metro:

```bash
npm start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Running the backend locally

```bash
cd server
npm install
cp .env.example .env
```

Set:

```text
OPENAI_API_KEY=your_key
DATABASE_URL=postgres_connection_string
OPENAI_MODEL=gpt-5.6-terra
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
```

Run:

```bash
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Backend API

```text
GET  /health
GET  /api/db/status
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/reports/analyze
POST /api/reports/sync
GET  /api/reports/sync
POST /api/devices/register
POST /api/translate/fields
POST /api/audio/transcribe
```

## Environment variables

Backend:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes for real AI | Enables GPT analysis, translation, and transcription |
| `OPENAI_MODEL` | No | Defaults to `gpt-5.6-terra` |
| `OPENAI_TRANSCRIBE_MODEL` | No | Defaults to `gpt-4o-transcribe` |
| `SESSION_TTL_DAYS` | No | Auth session lifetime, default 30 days |
| `PORT` | No | Railway injects this |

Mobile:

- `src/config.ts` points to the Railway backend URL.

## How GPT-5.6 is used

GPT-5.6 is used on the backend through the OpenAI Responses API with structured outputs. It converts unstructured construction reports into a strict typed schema containing site data, workers, tasks, materials, delays, contradictions, finance impact, and multilingual translations.

The prompt is designed to avoid inventing facts: if data is missing, the model must return `null` for nullable fields or a clear “not specified” equivalent for required text fields.

## How Codex was used

Codex was used as the primary development partner during the Build Week implementation:

- scaffolded and refactored the native React Native app;
- removed the initial web version after the product direction changed to mobile-only;
- implemented the dashboard, report capture, sites/finance, tasks, and settings tabs;
- built role-based auth screens and permission gates;
- implemented multilingual UI and report localization;
- connected Railway backend and PostgreSQL persistence;
- debugged Android runtime issues, including native voice input and Nitro module crashes;
- added API endpoints, schema validation, auth sessions, and report sync;
- ran TypeScript, lint, audit, backend build, Railway deploy, and smoke tests.

## Key human product decisions

- Build a mobile-first tool for construction teams instead of a web dashboard.
- Use Work & Productivity as the Build Week category.
- Prioritize one real field workflow: daily report → structured report → tasks/materials/delays → manager message.
- Support Russian, Hebrew, and English because multilingual construction crews are a real operational constraint.
- Keep judge access simple with seeded demo accounts.
- Use Railway PostgreSQL so report sync survives backend restarts.

## Known limitations

- Real push notification delivery is prepared at the API/device-token layer, but production FCM/APNs credentials are not configured yet.
- AI features require `OPENAI_API_KEY` in Railway.
- The app currently uses local-first storage plus sync queue; full multi-device live conflict resolution is not complete.
- Photo upload is available in the app UI, but cloud object storage for photos is not yet implemented.
- Voice input uses native OS speech recognition for live dictation; OpenAI audio transcription endpoint exists as a backend option.
- A production app store release would still need signing, privacy policy, production monitoring, and hardened auth flows.

## Verification commands

Root app:

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm audit --omit=dev
```

Backend:

```bash
cd server
npm run typecheck
npm run build
npm audit --omit=dev
```

Railway smoke tests:

```bash
curl https://siteops-ai-api-production-c0af.up.railway.app/health
curl https://siteops-ai-api-production-c0af.up.railway.app/api/db/status
```

## License

MIT

# OpenAI Build Week Submission Draft

Use this text to fill the Devpost submission form.

## Project name

SiteOps AI

## Category

Work and Productivity

## Tagline

AI construction site copilot that turns multilingual daily reports into structured work logs, tasks, material alerts, delays, finance context, and manager messages.

## Project URL / Demo URL

Backend health/demo API:

```text
https://siteops-ai-api-production-c0af.up.railway.app
```

Mobile app demo should be shown in the YouTube video. If an APK/test build is created later, add the download link here.

## Repository

```text
https://github.com/Lilemmi/siteops-ai
```

## What it does

SiteOps AI is a native Android/iOS app for construction teams. A foreman can type or dictate a daily site report in Russian, Hebrew, or English. GPT-5.6 converts that raw field text into a structured construction report: site, date, workers, completed work, floors/sections, used materials, missing materials, delays, responsible people, financial impact, next-day tasks, contradictions, and a professional Hebrew manager message.

The app also supports role-based access for owners, managers, foremen, accountants, and workers. It includes a dashboard, site/finance overview, task tracking, checklist status, report photos, offline queue, cloud sync, PostgreSQL persistence, and multilingual UI.

## The problem it solves

Construction sites often rely on informal messages and voice notes. Important operational facts get buried: missing materials, elevator delays, workforce count, unpaid invoices, next-day priorities, and coordination tasks. This becomes harder when field teams communicate in multiple languages.

SiteOps AI creates a structured operational layer from the way workers already report: plain text or voice.

## How we built it

The mobile app is built with React Native and TypeScript without Expo. The backend is an Express API deployed on Railway with PostgreSQL. GPT-5.6 is used through the OpenAI Responses API with structured outputs, so report analysis returns a typed schema instead of free-form text.

The backend also handles user registration/login, session tokens, report sync, device token registration, field translation, and audio transcription support. The mobile app uses native speech recognition for immediate voice input and then sends the recognized text to the report analysis flow.

## How GPT-5.6 is used

GPT-5.6 analyzes construction daily reports and returns a structured object with strict fields. It also produces English, Russian, and Hebrew translations for human-readable report fields, while preserving numbers, floor identifiers, quantities, dimensions, invoice numbers, supplier names, and proper names.

The system prompt instructs the model not to invent missing data. If information is not present, it returns `null` or a clear “not specified” equivalent.

## How Codex was used

Codex was the primary development partner for the project. It helped:

- remove the original web direction and rebuild as a native mobile app;
- design and implement the dashboard, report capture, sites/finance, tasks, and settings tabs;
- implement multilingual UI and localized structured report views;
- add role-based auth screens and permissions;
- debug Android runtime issues and native voice input;
- deploy the Railway backend;
- add PostgreSQL persistence;
- implement cloud registration/login and seeded test accounts;
- run TypeScript, lint, audit, backend builds, Railway deploys, and smoke tests.

## Key features

- Native Android/iOS app.
- Text report capture.
- Voice report capture.
- Photo attachments inside reports.
- Manual site selection.
- GPT-5.6 structured construction report analysis.
- Multilingual app UI: English, Russian, Hebrew.
- Multilingual report fields: users can view structured content in their app language.
- Dashboard with site metrics, progress overview, recent activity, checklist, photos, and team chat demo state.
- Sites/finance overview with payments and cost breakdown.
- Task and alert tracking.
- Cloud registration/login.
- Roles: owner, manager, foreman, accountant, worker.
- PostgreSQL report sync.
- Offline queue for report sync.
- Backup export.
- Test accounts for judges.

## Testing instructions for judges

1. Clone the repository:

   ```bash
   git clone https://github.com/Lilemmi/siteops-ai.git
   cd siteops-ai
   npm install
   ```

2. Start Metro:

   ```bash
   npm start
   ```

3. Run Android:

   ```bash
   npm run android
   ```

4. Or run iOS:

   ```bash
   bundle install
   cd ios
   bundle exec pod install
   cd ..
   npm run ios
   ```

5. Log in with a judge account:

   ```text
   owner@siteops.ai / demo123
   manager@siteops.ai / demo123
   foreman@siteops.ai / demo123
   accountant@siteops.ai / demo123
   worker@siteops.ai / demo123
   ```

6. Open the Report tab and enter:

   ```text
   Сегодня на объекте работали 12 рабочих. Устанавливали металлические профили на стенах и потолке в секции B. Задержка по лифту — поставка перенесена на 2 дня. Не хватает крепежа: дюбель-гвоздей 6×40 и саморезов для ГКЛ.
   ```

7. Analyze the report, review the structured output, save it, and check the generated tasks.

8. Open Sites and More tabs to review finance, backup, API/database status, and account settings.

## Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@siteops.ai` | `demo123` |
| Manager | `manager@siteops.ai` | `demo123` |
| Foreman | `foreman@siteops.ai` | `demo123` |
| Accountant | `accountant@siteops.ai` | `demo123` |
| Worker | `worker@siteops.ai` | `demo123` |

## What is new for Build Week

The core implementation was built during OpenAI Build Week with Codex:

- native mobile UI;
- report capture and structured analysis;
- multilingual app/content support;
- cloud auth;
- Railway backend;
- PostgreSQL persistence;
- role permissions;
- report sync;
- voice input;
- task and finance workflows;
- README/testing materials.

## Known limitations

- Real GPT behavior requires `OPENAI_API_KEY` configured on Railway.
- Real push notification delivery requires FCM/APNs credentials; the device-token backend endpoint is ready.
- Photo upload is local in the current mobile MVP; cloud object storage is not yet implemented.
- Full multi-device conflict resolution is not complete.
- A production app store release still needs signing, monitoring, privacy policy, and app review preparation.

## 3-minute YouTube video script

### 0:00–0:20 — Problem

“Construction teams lose time because daily site updates arrive as informal notes or voice messages in different languages. Managers need structured facts: workers, materials, delays, money impact, and next actions.”

### 0:20–0:45 — Product

“This is SiteOps AI, a native Android and iOS app. It turns Russian, Hebrew, or English field reports into structured construction intelligence.”

### 0:45–1:30 — Demo report

Show login, Report tab, site selection, text or voice input, photo button, and analysis. Use the sample Russian report. Show the structured result: workers, completed work, location, issues, missing materials, delays, next steps, and Hebrew manager message.

### 1:30–2:05 — Operations

Show Dashboard, checklist status, Tasks tab, generated material alerts, Sites/Finance tab, payments and cost breakdown.

### 2:05–2:35 — Backend

Show Railway health/database status or mention the deployed backend: Express API, PostgreSQL, auth sessions, report sync, and device-token endpoint.

### 2:35–2:55 — Codex and GPT-5.6

“Codex helped build and debug the native app, backend, Railway deployment, PostgreSQL persistence, multilingual UI, and voice input. GPT-5.6 powers the structured report extraction and multilingual report fields.”

### 2:55–3:00 — Close

“SiteOps AI turns field reports into action: capture, analyze, act.”

## Devpost checklist

- [x] Public GitHub repository
- [x] License
- [x] README with setup instructions
- [x] Backend deployed
- [x] PostgreSQL connected
- [x] Test accounts
- [ ] OPENAI_API_KEY configured in Railway
- [ ] YouTube demo video under 3 minutes
- [ ] Codex `/feedback` Session ID
- [ ] Optional Android APK/test build link
- [ ] Final Devpost submission

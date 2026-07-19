import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {toFile} from 'openai/uploads';
import pg from 'pg';
import {z} from 'zod';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const {Pool} = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 6,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 25 * 1024 * 1024, files: 1},
});

const workItemSchema = z.object({
  description: z.string(),
  workers: z.number().int().nullable(),
  floors: z.array(z.string()),
});

const materialItemSchema = z.object({name: z.string(), quantity: z.string()});
const delayItemSchema = z.object({reason: z.string(), impact: z.string()});

const reportTranslationSchema = z.object({
  site: z.string(),
  workHours: z.string(),
  paymentType: z.string(),
  completedWork: z.array(workItemSchema),
  usedMaterials: z.array(materialItemSchema),
  missingMaterials: z.array(materialItemSchema),
  delays: z.array(delayItemSchema),
  responsiblePeople: z.array(z.string()),
  financialImpact: z.string(),
  nextDayTasks: z.array(z.string()),
  contradictions: z.array(z.string()),
  managerMessage: z.string(),
  summary: z.string(),
});

const translatedFieldsSchema = z.object({
  en: z.record(z.string(), z.string()),
  ru: z.record(z.string(), z.string()),
  he: z.record(z.string(), z.string()),
});

const reportSchema = z.object({
  inputLanguage: z.enum(['ru', 'he', 'en', 'unknown']),
  site: z.string(),
  reportDate: z.string(),
  workersCount: z.number().int().nullable(),
  workHours: z.string(),
  paymentType: z.string(),
  completedWork: z.array(workItemSchema),
  floors: z.array(z.string()),
  usedMaterials: z.array(materialItemSchema),
  missingMaterials: z.array(materialItemSchema),
  delays: z.array(delayItemSchema),
  responsiblePeople: z.array(z.string()),
  financialImpact: z.string(),
  nextDayTasks: z.array(z.string()),
  contradictions: z.array(z.string()),
  managerMessageHebrew: z.string(),
  summary: z.string(),
  translations: z.object({
    en: reportTranslationSchema,
    ru: reportTranslationSchema,
    he: reportTranslationSchema,
  }),
});

async function initializeDatabase() {
  if (!pool) {
    return;
  }

  await pool.query(`
    create table if not exists reports (
      id text primary key,
      site text not null,
      site_id text,
      report_date text,
      source text,
      payload jsonb not null,
      synced_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists reports_site_idx on reports (site);
    create index if not exists reports_site_id_idx on reports (site_id);
    create index if not exists reports_synced_at_idx on reports (synced_at desc);

    create table if not exists devices (
      token text primary key,
      platform text not null default 'unknown',
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists devices_platform_idx on devices (platform);
    create index if not exists devices_updated_at_idx on devices (updated_at desc);
  `);
}

const databaseReady = initializeDatabase().catch(error => {
  console.error('Database initialization failed.', error);
  throw error;
});

async function ensureDatabaseReady() {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }
  await databaseReady;
}

async function getDatabaseStatus() {
  if (!pool) {
    return {configured: false, connected: false};
  }

  try {
    await databaseReady;
    const result = await pool.query<{now: string}>('select now()::text as now');
    return {configured: true, connected: true, now: result.rows[0]?.now};
  } catch (error) {
    console.error('Database status check failed.', error);
    return {configured: true, connected: false};
  }
}

app.use(express.json({limit: '100kb'}));

app.get('/health', async (_request, response) => {
  const database = await getDatabaseStatus();
  response.status(database.configured && !database.connected ? 503 : 200).json({
    ok: database.configured ? database.connected : true,
    model: process.env.OPENAI_MODEL ?? 'gpt-5.6-terra',
    database,
  });
});

app.get('/api/db/status', async (_request, response) => {
  const database = await getDatabaseStatus();
  response.status(database.configured && database.connected ? 200 : 503).json({ok: database.connected, database});
});

app.post('/api/reports/sync', async (request, response) => {
  const report = request.body;
  if (!report || typeof report.id !== 'string' || typeof report.site !== 'string') {
    response.status(400).json({error: 'A valid report payload is required.'});
    return;
  }

  try {
    await ensureDatabaseReady();
    const syncedAt = new Date().toISOString();
    const payload = {...report, syncedAt};
    await pool!.query(
      `
        insert into reports (id, site, site_id, report_date, source, payload, synced_at, updated_at)
        values ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
        on conflict (id) do update set
          site = excluded.site,
          site_id = excluded.site_id,
          report_date = excluded.report_date,
          source = excluded.source,
          payload = excluded.payload,
          synced_at = excluded.synced_at,
          updated_at = now()
      `,
      [
        report.id,
        report.site,
        typeof report.siteId === 'string' ? report.siteId : null,
        typeof report.reportDate === 'string' ? report.reportDate : null,
        typeof report.source === 'string' ? report.source : null,
        JSON.stringify(payload),
        syncedAt,
      ],
    );
    response.json({ok: true, id: report.id, syncedAt});
  } catch (error) {
    console.error(error);
    response.status(503).json({error: 'Database is not available.'});
  }
});

app.get('/api/reports/sync', async (_request, response) => {
  try {
    await ensureDatabaseReady();
    const result = await pool!.query<{payload: unknown; synced_at: string}>(
      'select payload, synced_at::text from reports order by synced_at desc limit 200',
    );
    response.json({ok: true, count: result.rowCount, reports: result.rows.map(row => row.payload)});
  } catch (error) {
    console.error(error);
    response.status(503).json({error: 'Database is not available.'});
  }
});

app.post('/api/devices/register', async (request, response) => {
  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  const platform = typeof request.body?.platform === 'string' ? request.body.platform : 'unknown';
  if (!token) {
    response.status(400).json({error: 'Push token is required.'});
    return;
  }

  try {
    await ensureDatabaseReady();
    await pool!.query(
      `
        insert into devices (token, platform, payload, updated_at)
        values ($1, $2, $3::jsonb, now())
        on conflict (token) do update set
          platform = excluded.platform,
          payload = excluded.payload,
          updated_at = now()
      `,
      [token, platform, JSON.stringify(request.body ?? {})],
    );
    response.json({ok: true});
  } catch (error) {
    console.error(error);
    response.status(503).json({error: 'Database is not available.'});
  }
});

app.post('/api/translate/fields', async (request, response) => {
  const fields = request.body?.fields && typeof request.body.fields === 'object'
    ? request.body.fields as Record<string, unknown>
    : {};
  const cleanFields = Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([key, value]) => key.length > 0 && value.length > 0 && value.length <= 2000),
  );

  if (!Object.keys(cleanFields).length) {
    response.status(400).json({error: 'At least one text field is required.'});
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({error: 'OPENAI_API_KEY is not configured.'});
    return;
  }

  try {
    const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
    const result = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.6-terra',
      reasoning: {effort: 'low'},
      input: [
        {
          role: 'system',
          content:
            'Translate short construction app fields into English, Russian, and Hebrew. Preserve numbers, dates, floor identifiers, section letters, quantities, dimensions, invoice numbers, supplier names, personal names, and proper names. Return the same field keys under en, ru, and he. Use concise professional construction terminology.',
        },
        {
          role: 'user',
          content: JSON.stringify(cleanFields),
        },
      ],
      text: {format: zodTextFormat(translatedFieldsSchema, 'translated_fields')},
    });

    if (!result.output_parsed) {
      response.status(502).json({error: 'The model did not return translations.'});
      return;
    }

    response.json({translations: result.output_parsed});
  } catch (error) {
    console.error(error);
    response.status(502).json({error: 'Translation request failed.'});
  }
});

app.post('/api/audio/transcribe', upload.single('audio'), async (request, response) => {
  const languageHint = typeof request.body?.language === 'string' ? request.body.language : 'auto';
  const language = languageHint === 'ru' || languageHint === 'he' || languageHint === 'en'
    ? languageHint
    : undefined;

  if (!request.file) {
    response.status(400).json({error: 'Audio file is required.'});
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({error: 'OPENAI_API_KEY is not configured.'});
    return;
  }

  try {
    const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
    const file = await toFile(
      request.file.buffer,
      request.file.originalname || 'siteops-voice-report.m4a',
      {type: request.file.mimetype || 'audio/mp4'},
    );
    const transcription = await client.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe',
      language,
      prompt:
        'Construction daily report. Keep construction terms, floor numbers, quantities, supplier names, and material dimensions exactly. The speaker may use Russian, Hebrew, or English, with terms such as profiles, drywall, dowel nails 6x40, elevator delivery, section, floor, workers, yomit, payments, debts, delays.',
      response_format: 'json',
    });

    const text = typeof transcription.text === 'string' ? transcription.text.trim() : '';
    if (!text) {
      response.status(422).json({error: 'No speech was detected in the audio.'});
      return;
    }

    response.json({
      text,
      language: language ?? 'auto',
      source: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe',
    });
  } catch (error) {
    console.error(error);
    response.status(502).json({error: 'OpenAI transcription failed.'});
  }
});

app.post('/api/reports/analyze', async (request, response) => {
  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
  const language = typeof request.body?.language === 'string' ? request.body.language : 'auto';
  const date = typeof request.body?.date === 'string' ? request.body.date : new Date().toISOString().slice(0, 10);

  if (text.length < 10 || text.length > 20_000) {
    response.status(400).json({error: 'Report text must contain 10-20000 characters.'});
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({error: 'OPENAI_API_KEY is not configured.'});
    return;
  }

  try {
    const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
    const result = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.6-terra',
      reasoning: {effort: 'low'},
      input: [
        {
          role: 'system',
          content:
            'You extract construction daily reports. Never invent facts. If a value is not explicitly present, return null for nullable fields and a natural equivalent of "Not specified" for required text fields. Do not invent floors, work hours, payment type, amounts, suppliers, responsible people, or financial sums. Separate facts from possible assumptions. Preserve floor identifiers, sections, quantities, dimensions, and material names exactly. Detect the input language. The top-level report fields must be written in the same language as the original report (Russian, Hebrew, or English). Also fill translations.en, translations.ru, and translations.he with professional construction-language translations of every human-readable structured field: site, workHours, paymentType, completedWork descriptions, materials, delays, responsiblePeople, financialImpact, nextDayTasks, contradictions, managerMessage, and summary. Keep numbers, floor identifiers, section letters, quantities, dimensions, invoice numbers, supplier names, and proper names unchanged across translations. managerMessageHebrew must remain professional Hebrew, and translations.he.managerMessage should match the Hebrew manager message. Surface missing information and possible contradictions explicitly.',
        },
        {
          role: 'user',
          content: `Current date: ${date}\nLanguage hint: ${language}\nRaw site report:\n${text}`,
        },
      ],
      text: {format: zodTextFormat(reportSchema, 'construction_daily_report')},
    });

    if (!result.output_parsed) {
      response.status(502).json({error: 'The model did not return a structured report.'});
      return;
    }

    response.json({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: 'gpt',
      originalText: text,
      ...result.output_parsed,
    });
  } catch (error) {
    console.error(error);
    response.status(502).json({error: 'OpenAI request failed.'});
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`SiteOps AI API listening on http://0.0.0.0:${port}`);
});

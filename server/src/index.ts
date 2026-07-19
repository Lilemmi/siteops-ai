import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {toFile} from 'openai/uploads';
import {z} from 'zod';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const syncedReports = new Map<string, unknown>();
const registeredDevices = new Map<string, unknown>();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 25 * 1024 * 1024, files: 1},
});

const reportSchema = z.object({
  inputLanguage: z.enum(['ru', 'he', 'en', 'unknown']),
  site: z.string(),
  reportDate: z.string(),
  workersCount: z.number().int().nullable(),
  workHours: z.string(),
  paymentType: z.string(),
  completedWork: z.array(z.object({
    description: z.string(),
    workers: z.number().int().nullable(),
    floors: z.array(z.string()),
  })),
  floors: z.array(z.string()),
  usedMaterials: z.array(z.object({name: z.string(), quantity: z.string()})),
  missingMaterials: z.array(z.object({name: z.string(), quantity: z.string()})),
  delays: z.array(z.object({reason: z.string(), impact: z.string()})),
  responsiblePeople: z.array(z.string()),
  financialImpact: z.string(),
  nextDayTasks: z.array(z.string()),
  contradictions: z.array(z.string()),
  managerMessageHebrew: z.string(),
  summary: z.string(),
});

app.use(express.json({limit: '100kb'}));

app.get('/health', (_request, response) => {
  response.json({ok: true, model: process.env.OPENAI_MODEL ?? 'gpt-5.6-terra'});
});

app.post('/api/reports/sync', (request, response) => {
  const report = request.body;
  if (!report || typeof report.id !== 'string' || typeof report.site !== 'string') {
    response.status(400).json({error: 'A valid report payload is required.'});
    return;
  }
  const syncedAt = new Date().toISOString();
  syncedReports.set(report.id, {...report, syncedAt});
  response.json({ok: true, id: report.id, syncedAt});
});

app.get('/api/reports/sync', (_request, response) => {
  response.json({ok: true, count: syncedReports.size, reports: [...syncedReports.values()]});
});

app.post('/api/devices/register', (request, response) => {
  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  const platform = typeof request.body?.platform === 'string' ? request.body.platform : 'unknown';
  if (!token) {
    response.status(400).json({error: 'Push token is required.'});
    return;
  }
  registeredDevices.set(token, {token, platform, updatedAt: new Date().toISOString()});
  response.json({ok: true});
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
            'You extract construction daily reports. Never invent facts. If a value is not explicitly present, return null for nullable fields and a natural equivalent of "Not specified" for required text fields. Do not invent floors, work hours, payment type, amounts, suppliers, responsible people, or financial sums. Separate facts from possible assumptions. Preserve floor identifiers, sections, quantities, dimensions, and material names exactly. Detect the input language. Write summary, work descriptions, materials, impacts, financial consequences, next-day tasks, contradictions, and all missing-value labels in the same language as the original report (Russian, Hebrew, or English). Write managerMessageHebrew in professional, concise Hebrew regardless of input language. Surface missing information and possible contradictions explicitly.',
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

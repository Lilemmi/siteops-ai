import {Platform} from 'react-native';
import {API_BASE_URL} from '../config';
import {InputLanguage} from '../types/report';

export interface AudioTranscriptionResult {
  text: string;
  language: InputLanguage;
  source: string;
}

function normalizeAudioFile(uri: string) {
  const normalizedUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const lower = normalizedUri.toLowerCase();
  const extension = lower.includes('.wav') ? 'wav' : Platform.OS === 'ios' ? 'm4a' : 'mp4';
  const type = extension === 'wav' ? 'audio/wav' : extension === 'm4a' ? 'audio/m4a' : 'audio/mp4';

  return {
    uri: normalizedUri,
    name: `siteops-voice-report.${extension}`,
    type,
  };
}

export async function transcribeAudio(uri: string, language: InputLanguage): Promise<AudioTranscriptionResult> {
  const form = new FormData();
  form.append('audio', normalizeAudioFile(uri) as unknown as Blob);
  form.append('language', language);

  const response = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
    method: 'POST',
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.text !== 'string') {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Audio transcription failed.');
  }

  return {
    text: payload.text.trim(),
    language: payload.language ?? language,
    source: payload.source ?? 'gpt-4o-transcribe',
  };
}

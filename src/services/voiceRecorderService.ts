import {Platform} from 'react-native';

type RecordMeta = {
  currentPosition?: number;
  recordSecs?: number;
};

type NitroSoundModule = {
  default: {
    setSubscriptionDuration: (seconds: number) => void;
    addRecordBackListener: (listener: (meta: RecordMeta) => void) => void;
    removeRecordBackListener: () => void;
    startRecorder: (uri?: string, settings?: Record<string, unknown>, meteringEnabled?: boolean) => Promise<string>;
    stopRecorder: () => Promise<string>;
  };
  AudioEncoderAndroidType: Record<string, unknown>;
  AudioSourceAndroidType: Record<string, unknown>;
  AVEncoderAudioQualityIOSType: Record<string, unknown>;
  OutputFormatAndroidType: Record<string, unknown>;
};

let cachedModule: NitroSoundModule | null | undefined;

function loadNitroSound(): NitroSoundModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // Lazy require is intentional: if the native Nitro module is missing from an
    // already-installed debug APK, the whole app must not crash during startup.
    cachedModule = require('react-native-nitro-sound') as NitroSoundModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isVoiceRecorderAvailable(): boolean {
  return Boolean(loadNitroSound()?.default);
}

export function setupVoiceRecorder(onProgress: (milliseconds: number) => void): boolean {
  const sound = loadNitroSound();
  if (!sound?.default) {
    return false;
  }
  sound.default.setSubscriptionDuration(0.12);
  sound.default.addRecordBackListener(meta => {
    onProgress(meta.currentPosition ?? meta.recordSecs ?? 0);
  });
  return true;
}

export async function startVoiceRecording(): Promise<string> {
  const sound = loadNitroSound();
  if (!sound?.default) {
    throw new Error('Voice recorder native module is unavailable.');
  }
  const settings = {
    AudioSourceAndroid: sound.AudioSourceAndroidType.MIC,
    OutputFormatAndroid: sound.OutputFormatAndroidType.MPEG_4,
    AudioEncoderAndroid: sound.AudioEncoderAndroidType.AAC,
    AudioQuality: 'high',
    AudioChannels: 1,
    AudioSamplingRate: 16000,
    AudioEncodingBitRate: 64000,
    AVEncoderAudioQualityKeyIOS: sound.AVEncoderAudioQualityIOSType.high,
    AVNumberOfChannelsKeyIOS: 1,
    AVSampleRateKeyIOS: 16000,
    AVEncodingOptionIOS: 'aac',
  };
  return sound.default.startRecorder(undefined, settings, Platform.OS === 'ios' || Platform.OS === 'android');
}

export async function stopVoiceRecording(): Promise<string> {
  const sound = loadNitroSound();
  if (!sound?.default) {
    throw new Error('Voice recorder native module is unavailable.');
  }
  return sound.default.stopRecorder();
}

export async function cleanupVoiceRecorder(): Promise<void> {
  const sound = loadNitroSound();
  if (!sound?.default) {
    return;
  }
  sound.default.removeRecordBackListener();
  await sound.default.stopRecorder().catch(() => undefined);
}

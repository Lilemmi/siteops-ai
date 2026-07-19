/* eslint-env jest */

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    setSubscriptionDuration: jest.fn(),
    startRecorder: jest.fn(() => Promise.resolve('/tmp/siteops-voice-report.m4a')),
    stopRecorder: jest.fn(() => Promise.resolve('/tmp/siteops-voice-report.m4a')),
  },
  AudioEncoderAndroidType: {AAC: 3},
  AudioSourceAndroidType: {MIC: 1},
  AVEncoderAudioQualityIOSType: {high: 96},
  OutputFormatAndroidType: {MPEG_4: 2},
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
    removeItem: jest.fn(key => {
      delete store[key];
      return Promise.resolve();
    }),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
  };
});

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  writeFile: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(() => Promise.resolve({filePath: '/tmp/siteops-report.pdf'})),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({assets: []})),
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({children, ...props}) => React.createElement(View, props, children);
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Icon = props => React.createElement(View, props);
  return new Proxy({}, {get: () => Icon});
});

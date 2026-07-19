import {Platform} from 'react-native';

// Android emulator reaches the host via 10.0.2.2. For a physical device,
// replace this value with the computer's LAN IP or a deployed HTTPS API URL.
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8787',
  ios: 'http://127.0.0.1:8787',
  default: 'http://127.0.0.1:8787',
});

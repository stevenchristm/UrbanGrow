import Constants from 'expo-constants';

// Automatically detect the dev server IP from Expo
// so you don't need to change this when switching WiFi networks
function getDevServerIP(): string {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.100.10:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }
  // Fallback
  return 'localhost';
}

const BACKEND_PORT = 8080;
const HOST = getDevServerIP();

const API_URL = `http://${HOST}:${BACKEND_PORT}`;
const WS_URL = `ws://${HOST}:${BACKEND_PORT}/ws`;

console.log(`📡 API_URL: ${API_URL}`);
console.log(`🔌 WS_URL: ${WS_URL}`);

export { API_URL, WS_URL };

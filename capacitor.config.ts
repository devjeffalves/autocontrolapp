import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autocontrol.app',
  appName: 'AutoControl',
  webDir: 'public',
  server: {
    url: 'https://autocontrolapp.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

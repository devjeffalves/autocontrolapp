import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autocontrol.app',
  appName: 'AutoControl',
  webDir: 'public',
  server: {
    // Em produção na Vercel, altere para a sua URL (ex: 'https://seu-autocontrol.vercel.app')
    url: process.env.CAPACITOR_SERVER_URL || 'http://192.168.1.80:3000',
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

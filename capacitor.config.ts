import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rewise.app',
  appName: 'Re.Wise',
  webDir: 'dist',
  backgroundColor: '#F7F7F4',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    CapacitorSQLite: {
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DEFAULT',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#F7F7F4',
    },
  },
};

export default config;

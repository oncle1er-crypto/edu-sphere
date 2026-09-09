import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ci.ecftech.edusphere",
  appName: "La Providence",
  webDir: "dist",
  backgroundColor: "#fffaf0",
  android: {
    backgroundColor: "#fffaf0",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1400,
      backgroundColor: "#fffaf0",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      backgroundColor: "#7f1734",
      style: "LIGHT",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

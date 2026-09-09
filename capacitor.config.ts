import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

/**
 * Hosted-WebView packaging: the native iOS / Android shells load the LIVE
 * production site (`server.url`) — the frontend is never duplicated or bundled
 * into the app. Shipping a change = deploying to Vercel.
 *
 * `webDir` ("native/") holds only the splash shown before the remote loads and
 * the offline cold-start fallback. Serwist handles real offline caching.
 */
const config: CapacitorConfig = {
  appId: "com.voltairstudio.portal",
  appName: "Voltair Portal",
  webDir: "native",
  server: {
    url: "https://portalvoltairstudio.vercel.app",
    cleartext: false, // HTTPS only — no plaintext traffic
  },
  ios: {
    // Let the WebView flow under the status bar / Dynamic Island; the app's CSS
    // reclaims the space with env(safe-area-inset-*).
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      // "DARK" = light glyphs, for our obsidian background.
      style: "DARK",
      backgroundColor: "#0A0A0A",
      overlaysWebView: true,
    },
    Keyboard: {
      // Resize the native WebView so the fixed bottom nav + safe-area padding
      // stay correct when the keyboard opens.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
      style: KeyboardStyle.Dark,
    },
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#0A0A0A",
      showSpinner: false,
    },
  },
};

export default config;

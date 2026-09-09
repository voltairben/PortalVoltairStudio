"use client";

import { useEffect } from "react";

/**
 * When the portal runs inside the Capacitor native shell (iOS / Android), align
 * the status bar with the obsidian theme and let the WebView flow under the
 * status bar / Dynamic Island so the app's `env(safe-area-inset-*)` padding
 * (portal + admin layouts, bottom nav) does the spacing.
 *
 * Everything is dynamically imported and gated on `isNativePlatform()`, so a
 * browser visitor never downloads or runs the Capacitor plugins.
 */
export function CapacitorProvider() {
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      document.documentElement.classList.add("capacitor-native");

      const [{ StatusBar, Style }, { Keyboard }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/keyboard"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#0A0A0A" }).catch(() => {});
      }
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

      const show = await Keyboard.addListener("keyboardWillShow", () =>
        document.documentElement.classList.add("keyboard-open"),
      );
      const hide = await Keyboard.addListener("keyboardWillHide", () =>
        document.documentElement.classList.remove("keyboard-open"),
      );
      cleanup = () => {
        show.remove();
        hide.remove();
      };
    })();

    return () => cleanup();
  }, []);

  return null;
}

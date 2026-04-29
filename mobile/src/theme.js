// Lightweight theme system for the mobile app. Provides two palettes
// (`dark` — current Trojan look — and `light`) plus a `ThemeProvider` so
// any screen / card can read or change the theme via `useTheme()`.
//
// Only the most visible surfaces (screen background, card fills, text)
// consume the palette so we don't have to rewrite every static StyleSheet
// in the codebase. The orange/cobalt brand accents stay constant across
// both modes by design.

import { createContext, useContext, useMemo, useState } from "react";
import { alpha, colors } from "./designSystem";

export const themes = {
  dark: {
    name: "dark",
    statusBarStyle: "light",
    background: ["#04111f", "#0b335a", "#0f63a2"],
    screenBg: colors.navy,
    surface: alpha(colors.white, 0.06),
    surfaceStrong: alpha(colors.white, 0.12),
    surfaceBorder: alpha(colors.white, 0.1),
    surfaceBorderStrong: alpha(colors.white, 0.2),
    text: colors.white,
    textMuted: alpha(colors.white, 0.72),
    textFaint: alpha(colors.white, 0.55),
    accent: colors.orange,
    accentSoft: alpha(colors.orange, 0.18),
    secondaryAccent: colors.cobalt,
    populationTrack: alpha(colors.white, 0.12),
    tabBarBg: "rgba(7, 26, 47, 0.96)",
    tabBarBorder: alpha(colors.white, 0.08),
    tabActive: colors.orange,
    tabInactive: alpha(colors.white, 0.55),
    danger: colors.error,
    success: colors.success,
  },
  light: {
    name: "light",
    statusBarStyle: "dark",
    background: ["#fff7ef", "#eef4fb", "#dce7f3"],
    screenBg: "#f6f1e8",
    surface: alpha(colors.white, 0.92),
    surfaceStrong: colors.white,
    surfaceBorder: alpha(colors.ink, 0.08),
    surfaceBorderStrong: alpha(colors.ink, 0.18),
    text: colors.ink,
    textMuted: alpha(colors.ink, 0.66),
    textFaint: alpha(colors.ink, 0.5),
    accent: colors.orangeDeep,
    accentSoft: alpha(colors.orange, 0.16),
    secondaryAccent: colors.cobalt,
    populationTrack: alpha(colors.ink, 0.1),
    tabBarBg: alpha(colors.white, 0.96),
    tabBarBorder: alpha(colors.ink, 0.08),
    tabActive: colors.orangeDeep,
    tabInactive: alpha(colors.ink, 0.5),
    danger: colors.error,
    success: colors.success,
  },
};

const ThemeContext = createContext({
  theme: themes.dark,
  themeName: "dark",
  setThemeName: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children, initial = "dark" }) {
  const [themeName, setThemeName] = useState(initial);

  const value = useMemo(
    () => ({
      theme: themes[themeName] || themes.dark,
      themeName,
      setThemeName,
      toggleTheme: () =>
        setThemeName((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [themeName],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

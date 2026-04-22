import { Platform } from "react-native";

export function alpha(hex, opacity) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;

  const value = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${normalized}${value}`;
}

export const colors = {
  ink: "#102033",
  inkSoft: "#415266",
  inkMuted: "#66778d",
  white: "#ffffff",
  cream: "#fff7ef",
  mist: "#eef4fb",
  haze: "#dce7f3",
  navy: "#071a2f",
  royal: "#0e4f8a",
  cobalt: "#1670be",
  orange: "#f48322",
  orangeDeep: "#c96113",
  gold: "#b57b0a",
  success: "#1d7a52",
  successSoft: "#e4f5ee",
  error: "#b94b43",
  errorSoft: "#fdecea",
  info: "#dcecff",
  infoDeep: "#0c4d87",
};

export const gradients = {
  background: ["#04111f", "#0b335a", "#0f63a2"],
  hero: [alpha(colors.white, 0.16), alpha(colors.white, 0.05)],
  panel: [alpha(colors.white, 0.98), alpha(colors.white, 0.93)],
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radii = {
  sm: 14,
  md: 22,
  lg: 32,
  pill: 999,
};

export const typography = {
  fontFamilyBrand: Platform.select({
    ios: "Georgia",
    android: "serif",
    web: 'Georgia, "Times New Roman", serif',
    default: undefined,
  }),
  fontFamilySans: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif",
    web: '"Trebuchet MS", "Gill Sans", sans-serif',
    default: undefined,
  }),
  display: Platform.select({ web: 48, default: 40 }),
  heading: 28,
  title: 22,
  body: 16,
  caption: 13,
  overline: 12,
};

export const layout = {
  contentMaxWidth: 1120,
  formMaxWidth: 520,
  wideBreakpoint: 980,
  stackedBreakpoint: 720,
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: "0 24px 70px rgba(4, 17, 31, 0.22)",
    },
    default: {
      elevation: 7,
      shadowColor: "#04111f",
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
    },
  }),
  soft: Platform.select({
    web: {
      boxShadow: "0 10px 28px rgba(4, 17, 31, 0.14)",
    },
    default: {
      elevation: 3,
      shadowColor: "#04111f",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
  }),
};

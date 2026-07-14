export const colors = {
  light: { ink: '#1F232B', muted: '#737780', surface: '#F9FAFC', raised: '#FFFFFF', border: '#E2E5EA', sidebar: '#F1F3F6', accent: '#2155E5', accentSoft: '#DFE9FF', danger: '#C54444' },
  dark: { ink: '#EEF0F5', muted: '#A8ADB8', surface: '#24272E', raised: '#2B2F37', border: '#454A55', sidebar: '#1D2026', accent: '#6E92FF', accentSoft: '#27375F', danger: '#FF8B8B' },
} as const;

export type ThemeColors = { [K in keyof typeof colors.light]: string };

export const colors = {
  light: { ink: '#172033', muted: '#6D7688', surface: '#F5F7FB', raised: '#FFFFFF', border: '#E2E7F0', sidebar: '#EDF2FA', accent: '#2457E6', accentSoft: '#E4ECFF', accentStrong: '#163CB7', success: '#208A68', warning: '#B77718', danger: '#C54444', shadow: '#172033' },
  dark: { ink: '#F1F4FA', muted: '#A8B0C0', surface: '#171A21', raised: '#222732', border: '#363E4E', sidebar: '#1D222C', accent: '#7D9BFF', accentSoft: '#29375F', accentStrong: '#AFC0FF', success: '#51C99C', warning: '#F0B95E', danger: '#FF8B8B', shadow: '#000000' },
} as const;

export type ThemeColors = { [K in keyof typeof colors.light]: string };

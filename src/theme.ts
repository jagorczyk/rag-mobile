/** Minimum interactive control size (logical px) — HIG / Kole Jain fat-finger floor. */
export const TOUCH_TARGET_MIN = 44;

export const colors = {
  light: {
    ink: '#000000',
    muted: '#6B6B6B',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    border: '#E5E5E5',
    soft: '#F7F7F8',
    sidebar: '#F7F7F8',
    accent: '#000000',
    accentSoft: '#F7F7F8',
    accentStrong: '#000000',
    success: '#000000',
    warning: '#000000',
    danger: '#C54444',
    shadow: '#000000',
  },
} as const;

export type ThemeColors = { [K in keyof typeof colors.light]: string };

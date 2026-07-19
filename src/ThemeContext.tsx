import { createContext, useContext, useMemo } from 'react';
import { colors, type ThemeColors } from './theme';

type ThemeContextValue = { colors: ThemeColors };
const Context = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const value = useMemo(() => ({ colors: colors.light }), []);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useTheme = () => { const value=useContext(Context); if(!value) throw new Error('ThemeProvider missing'); return value; };

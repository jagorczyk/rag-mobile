import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from './theme';

type ThemeContextValue = { dark: boolean; colors: ThemeColors; toggle: () => void };
const Context = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const system = useColorScheme() === 'dark'; const [override,setOverride] = useState<boolean|null>(false);
  useEffect(()=>{ AsyncStorage.getItem('rag.theme').then(v=>{ if (v === 'dark' || v === 'light') setOverride(v === 'dark'); }); },[]);
  const dark = override ?? system;
  const value = useMemo(()=>({dark, colors: dark ? colors.dark : colors.light, toggle:()=>setOverride(v=>{const next=!(v ?? system); AsyncStorage.setItem('rag.theme',next?'dark':'light'); return next;})}),[dark,system]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useTheme = () => { const value=useContext(Context); if(!value) throw new Error('ThemeProvider missing'); return value; };

import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

const client = new QueryClient({defaultOptions:{queries:{staleTime:15000, retry:1}}});
function RootStack() { return <><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,gestureEnabled:true,animation:'slide_from_right'}} /></>; }
SplashScreen.preventAutoHideAsync();
export default function Layout(){
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return <SafeAreaProvider><QueryClientProvider client={client}><ThemeProvider><RootStack/></ThemeProvider></QueryClientProvider></SafeAreaProvider>;
}

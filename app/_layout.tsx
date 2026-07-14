import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const client = new QueryClient({defaultOptions:{queries:{staleTime:15000, retry:1}}});
function RootStack() { const {dark}=useTheme(); return <><StatusBar style={dark?'light':'dark'}/><Stack screenOptions={{headerShown:false,gestureEnabled:true,animation:'slide_from_right'}} /></>; }
export default function Layout(){ return <SafeAreaProvider><QueryClientProvider client={client}><ThemeProvider><RootStack/></ThemeProvider></QueryClientProvider></SafeAreaProvider>; }

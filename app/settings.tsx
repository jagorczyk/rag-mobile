import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { getApiUrl, setApiUrl } from '@/api';
import { Button, Field, Header, Screen, styles } from '@/ui';

export default function Settings() { const { colors, dark, toggle } = useTheme(); const [url, setUrl] = useState(''); useEffect(() => { getApiUrl().then(setUrl); }, []); return <Screen><Header title="Ustawienia" action={<Pressable onPress={() => router.back()}><Text style={{ color: colors.accent, fontWeight: '700' }}>Gotowe</Text></Pressable>} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17, marginBottom: 8 }}>Backend</Text><Field value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="done" /><Button label="Zapisz adres" onPress={() => setApiUrl(url.trim()).then(() => Alert.alert('Zapisano', 'Adres backendu został zapisany.'))} /><Text style={{ height: 24 }} /><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17, marginBottom: 8 }}>Wygląd</Text><Button label={dark ? 'Używaj jasnego motywu' : 'Używaj ciemnego motywu'} secondary onPress={toggle} /></ScrollView></KeyboardAvoidingView></Screen>; }

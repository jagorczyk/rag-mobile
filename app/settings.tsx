import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { getApiUrl, setApiUrl } from '@/api';
import { Button, Field, Header, Screen, styles, Text, TOUCH_TARGET_MIN } from '@/ui';

export default function Settings() {
  const { colors } = useTheme();
  const [url, setUrl] = useState('');

  useEffect(() => {
    getApiUrl().then(setUrl);
  }, []);

  return (
    <Screen>
      <Header
        title="Ustawienia"
        onBack={() => router.back()}
        action={
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Gotowe"
            accessibilityRole="button"
            style={{ minHeight: TOUCH_TARGET_MIN, justifyContent: 'center', paddingHorizontal: 4 }}
          >
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>Gotowe</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17, marginBottom: 8 }}>Backend</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
            Adres serwera, z którym łączy się aplikacja. Zmień go, jeśli backend działa na innym hoście lub porcie.
          </Text>
          <Field
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            placeholder="http://localhost:8080"
            accessibilityLabel="Adres backendu"
          />
          <Button
            label="Zapisz adres"
            onPress={() =>
              setApiUrl(url.trim()).then(() => Alert.alert('Zapisano', 'Adres backendu został zapisany.'))
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

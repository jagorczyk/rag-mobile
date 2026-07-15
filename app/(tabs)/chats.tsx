import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChat, getChats } from '@/api';
import { useTheme } from '@/ThemeContext';
import { AnimatedPressable, EmptyState, Header, Loading, Screen, Surface, styles } from '@/ui';

export default function Chats() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const chats = useQuery({ queryKey: ['chats'], queryFn: getChats });
  const add = useMutation({
    mutationFn: createChat,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      router.push({ pathname: '/chat/[id]', params: { id: result.id } });
    },
    onError: (error) => {
      Alert.alert(
        'Nie udało się utworzyć rozmowy',
        `${error instanceof Error ? error.message : 'Sprawdź adres backendu w ustawieniach.'}\n\nTelefon musi mieć dostęp do komputera w tej samej sieci Wi‑Fi.`
      );
    },
  });

  return (
    <Screen>
      <Header
        title="Rozmowy"
        action={
          <Pressable
            onPress={() => add.mutate()}
            disabled={add.isPending}
            accessibilityLabel="Nowa rozmowa"
            hitSlop={10}
          >
            <Ionicons
              name="add-circle-outline"
              size={29}
              color={add.isPending ? colors.muted : colors.accent}
            />
          </Pressable>
        }
      />
      <View style={styles.content}>
        {chats.isLoading ? (
          <Loading />
        ) : chats.isError ? (
          <Text style={{ color: colors.danger }}>
            Nie udało się pobrać rozmów. Sprawdź adres backendu w ustawieniach.
          </Text>
        ) : (
          <FlatList
            data={chats.data}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <EmptyState icon="💬" title="Brak rozmów" description="Zacznij rozmowę, aby przeszukać swoją bazę wiedzy." />
            }
            renderItem={({ item }) => (
              <AnimatedPressable
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
                style={{ marginBottom: 10 }}
              >
                <Surface><View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} /></View>
                  <View style={{ marginLeft: 2, flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{item.title || 'Nowa rozmowa'}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('pl-PL') : 'Rozmowa bez wiadomości'}</Text></View>
                  <Ionicons name="chevron-forward" size={19} color={colors.muted} />
                </View></Surface>
              </AnimatedPressable>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChat, getChats, renameChat } from '@/api';
import { useTheme } from '@/ThemeContext';
import { AnimatedBottomSheet, Button, EmptyState, Field, Loading, Screen, Text, TextInput, TOUCH_TARGET_MIN } from '@/ui';
import type { Chat } from '@/types';

type ChatSection = { title: string; data: Chat[] };

function chatSections(chats: Chat[]): ChatSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = today - 6 * 24 * 60 * 60 * 1000;
  const groups: Record<string, Chat[]> = { Dzisiaj: [], 'Ostatnie 7 dni': [], Starsze: [], 'Bez daty': [] };
  chats.forEach(chat => {
    if (!chat.updatedAt || Number.isNaN(new Date(chat.updatedAt).getTime())) groups['Bez daty'].push(chat);
    else if (new Date(chat.updatedAt).getTime() >= today) groups.Dzisiaj.push(chat);
    else if (new Date(chat.updatedAt).getTime() >= weekAgo) groups['Ostatnie 7 dni'].push(chat);
    else groups.Starsze.push(chat);
  });
  return Object.entries(groups).filter(([, data]) => data.length).map(([title, data]) => ({ title, data }));
}

function formatChatDate(value?: string) {
  if (!value) return 'Rozmowa bez wiadomości';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Rozmowa bez wiadomości';
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function Chats() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [newName, setNewName] = useState('');
  const chats = useQuery({ queryKey: ['chats'], queryFn: getChats });
  const add = useMutation({
    mutationFn: createChat,
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      router.push({ pathname: '/chat/[id]', params: { id: result.id } });
    },
    onError: error => Alert.alert('Nie udało się utworzyć rozmowy', error instanceof Error ? error.message : 'Sprawdź adres backendu w ustawieniach.'),
  });
  const rename = useMutation({
    mutationFn: () => renameChat(renameTarget!.id, newName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chats'] }); setRenameTarget(null); },
    onError: error => Alert.alert('Nie udało się zmienić nazwy', error instanceof Error ? error.message : 'Spróbuj ponownie.'),
  });
  const sections = useMemo(
    () => chatSections((chats.data || []).filter(chat => chat.title.toLocaleLowerCase('pl').includes(query.trim().toLocaleLowerCase('pl')))),
    [chats.data, query],
  );
  const openRename = (chat: Chat) => {
    setNewName(chat.title === 'Nowa rozmowa' ? '' : chat.title);
    setRenameTarget(chat);
  };

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Rozmowy</Text>
          <Text style={{ color: colors.muted, marginTop: 3 }}>Zapytaj swoją bazę wiedzy</Text>
        </View>
        <Pressable
          onPress={() => add.mutate()}
          disabled={add.isPending}
          accessibilityLabel="Nowa rozmowa"
          accessibilityRole="button"
          style={[styles.addButton, { backgroundColor: colors.accent, opacity: add.isPending ? .55 : 1 }]}
        >
          <Ionicons name="add" size={25} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={[styles.search, { backgroundColor: colors.soft }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj rozmów"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.ink }]}
            returnKeyType="search"
            accessibilityLabel="Szukaj rozmów"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn} accessibilityLabel="Wyczyść wyszukiwanie" accessibilityRole="button">
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        {chats.isLoading ? (
          <Loading />
        ) : chats.isError ? (
          <View style={styles.error}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 8 }}>Nie udało się pobrać rozmów. Sprawdź połączenie z backendem.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={sections.length ? { paddingBottom: 110 } : { flexGrow: 1, paddingBottom: 110 }}
            renderSectionHeader={({ section }) => (
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="💬"
                title={query ? 'Brak wyników' : 'Brak rozmów'}
                description={query ? 'Spróbuj użyć innego słowa.' : 'Zacznij rozmowę, aby przeszukać swoją bazę wiedzy.'}
                action={!query ? <Button label="Nowa rozmowa" onPress={() => add.mutate()} disabled={add.isPending} /> : undefined}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? .58 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`Otwórz rozmowę ${item.title || 'Nowa rozmowa'}`}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="chatbubble-outline" size={19} color={colors.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{item.title || 'Nowa rozmowa'}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{formatChatDate(item.updatedAt)}</Text>
                </View>
                <Pressable
                  onPress={() => openRename(item)}
                  style={styles.moreBtn}
                  accessibilityLabel={`Zmień nazwę ${item.title}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="ellipsis-horizontal" size={21} color={colors.muted} />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
      {renameTarget && (
        <AnimatedBottomSheet onClose={() => !rename.isPending && setRenameTarget(null)} keyboardAvoiding>
          <Text style={[styles.renameTitle, { color: colors.ink }]}>Zmień nazwę rozmowy</Text>
          <Field
            autoFocus
            value={newName}
            onChangeText={setNewName}
            placeholder="Nazwa rozmowy"
            returnKeyType="done"
            onSubmitEditing={() => newName.trim() && rename.mutate()}
          />
          <View style={styles.renameActions}>
            <View style={{ flex: 1 }}><Button label="Anuluj" secondary onPress={() => setRenameTarget(null)} disabled={rename.isPending} /></View>
            <View style={{ flex: 1 }}><Button label={rename.isPending ? 'Zapisuję…' : 'Zapisz'} onPress={() => rename.mutate()} disabled={!newName.trim() || rename.isPending} /></View>
          </View>
        </AnimatedBottomSheet>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -.8 },
  content: { flex: 1, paddingHorizontal: 16 },
  addButton: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: TOUCH_TARGET_MIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0, minHeight: TOUCH_TARGET_MIN },
  clearBtn: { minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', paddingTop: 20, paddingBottom: 7 },
  row: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  moreBtn: { minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' },
  error: { alignItems: 'center', padding: 40 },
  renameTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  renameActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});

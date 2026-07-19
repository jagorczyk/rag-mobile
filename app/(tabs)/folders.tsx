import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChat, createFolder, deleteFolder, getChats, getFolders } from '@/api';
import type { Folder } from '@/types';
import { AnimatedPressable, AnimatedBottomSheet, Button, EmptyState, Field, Header, IconButton, Loading, Screen, SearchField, SectionTitle, Text, ToolbarIconButton, TOUCH_TARGET_MIN } from '@/ui';
import { useTheme } from '@/ThemeContext';

type FolderSort = 'recent' | 'asc' | 'desc';

function SheetAction({ icon, label, onPress, destructive = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; destructive?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ minHeight: TOUCH_TARGET_MIN + 8, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? .55 : 1 }]}
    >
      <Ionicons name={icon} size={21} color={destructive ? colors.danger : colors.accent} />
      <Text style={{ color: destructive ? colors.danger : colors.ink, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function FolderRow({ folder, onOpen, onMore }: { folder: Folder; onOpen: () => void; onMore: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onOpen} style={{ marginBottom: 1 }} accessibilityLabel={`Otwórz folder ${folder.name}`}>
      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="folder" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{folder.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{folder.updatedAt ? new Date(folder.updatedAt).toLocaleDateString('pl-PL') : 'Folder dokumentów'}</Text>
        </View>
        <Pressable
          onPress={event => { event.stopPropagation(); onMore(); }}
          style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={`Opcje folderu ${folder.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="ellipsis-horizontal" size={21} color={colors.muted} />
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

export default function Library() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Folder | null>(null);
  const [sort, setSort] = useState<FolderSort>('recent');
  const [sorting, setSorting] = useState(false);
  const folders = useQuery({ queryKey: ['folders'], queryFn: getFolders });
  const chats = useQuery({ queryKey: ['chats'], queryFn: getChats });
  const add = useMutation({
    mutationFn: () => createFolder(name.trim()),
    onSuccess: () => { setName(''); setAdding(false); queryClient.invalidateQueries({ queryKey: ['folders'] }); },
    onError: () => Alert.alert('Błąd', 'Nie udało się utworzyć folderu.'),
  });
  const newChat = useMutation({
    mutationFn: createChat,
    onSuccess: result => { queryClient.invalidateQueries({ queryKey: ['chats'] }); router.push({ pathname: '/chat/[id]', params: { id: result.id } }); },
    onError: () => Alert.alert('Nie udało się utworzyć rozmowy', 'Sprawdź połączenie z backendem w ustawieniach.'),
  });
  const needle = query.trim().toLocaleLowerCase('pl-PL');
  const visibleFolders = useMemo(() => [...(folders.data || [])].filter(folder => !needle || folder.name.toLocaleLowerCase('pl-PL').includes(needle)).sort((a, b) => {
    if (sort === 'asc') return a.name.localeCompare(b.name, 'pl');
    if (sort === 'desc') return b.name.localeCompare(a.name, 'pl');
    return (b.updatedAt || '').localeCompare(a.updatedAt || '') || a.name.localeCompare(b.name, 'pl');
  }), [folders.data, needle, sort]);
  const visibleChats = useMemo(() => (chats.data || []).filter(chat => !needle || chat.title.toLocaleLowerCase('pl-PL').includes(needle)).slice(0, 3), [chats.data, needle]);
  const remove = () => {
    if (!selected) return;
    const folder = selected;
    setSelected(null);
    Alert.alert('Usunąć folder?', `Folder „${folder.name}” i jego pliki zostaną usunięte.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => deleteFolder(folder.id).then(() => queryClient.invalidateQueries({ queryKey: ['folders'] })).catch(() => Alert.alert('Błąd', 'Nie udało się usunąć folderu.')) },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Biblioteka"
        action={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="add" label="Nowy folder" onPress={() => setAdding(true)} />
            <IconButton icon="settings-outline" label="Ustawienia" onPress={() => router.push('/settings')} />
          </View>
        }
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 122 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Szukaj folderów i rozmów" />
        <AnimatedPressable onPress={() => newChat.mutate()} disabled={newChat.isPending} style={{ marginTop: 16 }} accessibilityLabel="Zadaj pytanie bazie wiedzy">
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH_TARGET_MIN + 20 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>O co chcesz zapytać?</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Przeszukaj swoją bazę wiedzy</Text>
            </View>
            <Ionicons name="arrow-up" size={18} color={colors.accent} />
          </View>
        </AnimatedPressable>

        <SectionTitle
          action={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ToolbarIconButton icon="swap-vertical-outline" label="Sortuj foldery" onPress={() => setSorting(true)} />
              <Pressable
                onPress={() => setAdding(true)}
                style={{ minHeight: TOUCH_TARGET_MIN, justifyContent: 'center', paddingHorizontal: 8 }}
                accessibilityLabel="Dodaj folder"
                accessibilityRole="button"
              >
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>Dodaj</Text>
              </Pressable>
            </View>
          }
        >
          Foldery
        </SectionTitle>
        {folders.isLoading ? (
          <Loading />
        ) : folders.isError ? (
          <Text style={{ color: colors.danger, paddingVertical: 18 }}>Nie udało się pobrać folderów. Sprawdź adres backendu.</Text>
        ) : visibleFolders.length ? (
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            {visibleFolders.map(folder => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onOpen={() => router.push({ pathname: '/folders/[id]', params: { id: folder.id, name: folder.name } })}
                onMore={() => setSelected(folder)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="📁"
            title={needle ? 'Brak wyników' : 'Brak folderów'}
            description={needle ? 'Spróbuj innej nazwy.' : 'Dodaj pierwszy folder, aby przechowywać dokumenty i zdjęcia.'}
            action={!needle ? <Button label="Dodaj folder" onPress={() => setAdding(true)} /> : undefined}
          />
        )}

        <SectionTitle>Ostatnie rozmowy</SectionTitle>
        {chats.isLoading ? (
          <Loading />
        ) : visibleChats.length ? (
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            {visibleChats.map(chat => (
              <AnimatedPressable
                key={chat.id}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } })}
                style={{ minHeight: 62, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                accessibilityLabel={`Otwórz rozmowę ${chat.title}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.sidebar, alignItems: 'center', justifyContent: 'center', marginRight: 11 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700' }}>{chat.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString('pl-PL') : 'Rozmowa'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                </View>
              </AnimatedPressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="💬"
            title="Nie masz jeszcze rozmów"
            description="Zadaj pytanie bazie wiedzy, aby zacząć."
            action={<Button label="Nowa rozmowa" onPress={() => newChat.mutate()} disabled={newChat.isPending} />}
          />
        )}
      </ScrollView>

      {adding && (
        <AnimatedBottomSheet onClose={() => setAdding(false)} keyboardAvoiding>
          <Text style={{ color: colors.ink, fontSize: 21, fontWeight: '800', marginBottom: 5 }}>Nowy folder</Text>
          <Text style={{ color: colors.muted, marginBottom: 16 }}>Nadaj nazwę swojej kolekcji.</Text>
          <Field value={name} onChangeText={setName} placeholder="Np. Umowy 2026" autoFocus returnKeyType="done" onSubmitEditing={() => name.trim() && add.mutate()} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button label="Anuluj" secondary onPress={() => setAdding(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Utwórz" onPress={() => add.mutate()} disabled={!name.trim() || add.isPending} /></View>
          </View>
        </AnimatedBottomSheet>
      )}
      {selected && (
        <AnimatedBottomSheet onClose={() => setSelected(null)}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 3 }}>Opcje folderu</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, marginBottom: 15 }}>{selected.name}</Text>
          <SheetAction icon="trash-outline" label="Usuń folder" destructive onPress={remove} />
        </AnimatedBottomSheet>
      )}
      {sorting && (
        <AnimatedBottomSheet onClose={() => setSorting(false)}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Sortuj foldery</Text>
          {([{ key: 'recent', label: 'Ostatnio zmieniane' }, { key: 'asc', label: 'Nazwa: A–Z' }, { key: 'desc', label: 'Nazwa: Z–A' }] as { key: FolderSort; label: string }[]).map(option => (
            <Pressable
              key={option.key}
              onPress={() => { setSort(option.key); setSorting(false); }}
              accessibilityRole="button"
              accessibilityState={{ selected: option.key === sort }}
              style={{ minHeight: TOUCH_TARGET_MIN + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: colors.ink, fontSize: 16 }}>{option.label}</Text>
              {option.key === sort && <Ionicons name="checkmark" size={21} color={colors.accent} />}
            </Pressable>
          ))}
        </AnimatedBottomSheet>
      )}
    </Screen>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMentions, getPeople, renamePerson } from '@/api';
import { useTheme } from '@/ThemeContext';
import { AnimatedPressable, Button, EmptyState, Field, Header, Loading, ModalScreen, Screen, Surface, styles } from '@/ui';
import type { Mention, Person, Photo } from '@/types';

function PersonPhoto({ photo, mentions }: { photo: Photo; mentions: Mention[] }) {
  const { colors } = useTheme();
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const uri = `data:${photo.fileType};base64,${photo.imageBase64}`;
  return <View style={[galleryStyles.photoFrame, { backgroundColor: colors.sidebar, aspectRatio: imageSize.width / imageSize.height }]}>
    <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} onLoad={event => {
      const { width, height } = event.nativeEvent.source;
      if (width && height) setImageSize({ width, height });
    }} />
    {mentions.map(mention => {
      if (!mention.bbox || mention.bbox.length < 4) return null;
      const [x1, y1, x2, y2] = mention.bbox;
      return <View key={mention.id} pointerEvents="none" style={{ position: 'absolute', left: `${x1 / imageSize.width * 100}%`, top: `${y1 / imageSize.height * 100}%`, width: `${(x2 - x1) / imageSize.width * 100}%`, height: `${(y2 - y1) / imageSize.height * 100}%`, borderWidth: 3, borderColor: colors.accent, backgroundColor: 'rgba(36,87,230,.14)', borderRadius: 5 }} />;
    })}
  </View>;
}

function PersonGallery({ person, onClose }: { person: Person; onClose: () => void }) {
  const { colors } = useTheme();
  const [mentionsByPath, setMentionsByPath] = useState<Record<string, Mention[]>>({});
  const [loading, setLoading] = useState(true);
  const photos = useMemo(() => person.photos || [], [person.photos]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(photos.map(async photo => {
      try {
        const mentions = await getMentions(photo.path);
        return [photo.path, mentions.filter(mention => mention.entityId === person.id && mention.bbox && mention.bbox.length >= 4)] as const;
      } catch {
        return [photo.path, []] as const;
      }
    })).then(entries => {
      if (!active) return;
      setMentionsByPath(Object.fromEntries(entries));
      setLoading(false);
    });
    return () => { active = false; };
  }, [person.id, photos]);

  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <ModalScreen>
      <Header title={person.displayName} subtitle={`${photos.length} zdjęć z rozpoznaną twarzą`} action={<Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Zamknij galerię"><Ionicons name="close" size={28} color={colors.ink} /></Pressable>} />
      {loading ? <Loading label="Wyszukiwanie twarzy na zdjęciach" /> : <FlatList
        data={photos}
        keyExtractor={photo => photo.path}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        ListEmptyComponent={<EmptyState icon="🖼️" title="Brak zdjęć" description="Ta osoba nie ma jeszcze przypisanych zdjęć." />}
        renderItem={({ item }) => <View style={{ marginBottom: 18 }}><PersonPhoto photo={item} mentions={mentionsByPath[item.path] || []} /><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 7 }}>{item.fileName}</Text></View>}
      />}
    </ModalScreen>
  </Modal>;
}

export default function People() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Person | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const people = useQuery({ queryKey: ['people'], queryFn: getPeople });
  const save = useMutation({ mutationFn: () => renamePerson(editing!.id, name.trim()), onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['people'] }); }, onError: () => Alert.alert('Błąd', 'Nie udało się zmienić nazwy osoby.') });
  const visiblePeople = people.data?.filter(person => (person.photos?.length || 0) > 0) || [];

  return <Screen>
    <Header title="Osoby" subtitle="Rozpoznane twarze w dokumentach" />
    <View style={styles.content}>
      {people.isLoading ? <Loading /> : people.isError ? <Text style={{ color: colors.danger }}>Nie udało się pobrać osób. Sprawdź adres backendu w ustawieniach.</Text> : <FlatList
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        data={visiblePeople}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, alignItems: 'stretch' }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState icon="👤" title="Brak rozpoznanych osób" description="Dodaj zdjęcia do folderów, aby rozpocząć rozpoznawanie." />}
        renderItem={({ item }) => <AnimatedPressable onPress={() => setSelected(item)} style={{ flex: 1, minWidth: 0, marginBottom: 10 }} accessibilityLabel={`Pokaż zdjęcia osoby ${item.displayName}`}>
          <Surface style={{ width: '100%', minWidth: 0 }}><Image source={{ uri: `data:${item.photos![0].fileType};base64,${item.photos![0].imageBase64}` }} resizeMode="cover" style={{ width: '100%', aspectRatio: 1.15, borderRadius: 12, marginBottom: 11 }} /><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '900' }}>{item.displayName}</Text><Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 }}>{item.photos?.length || 0} zdjęć · dotknij, aby zobaczyć</Text></View><Pressable onPress={event => { event.stopPropagation(); setEditing(item); setName(item.displayName); }} hitSlop={8} accessibilityLabel={`Zmień nazwę ${item.displayName}`}><Ionicons name="pencil-outline" size={19} color={colors.accent} /></Pressable></View></Surface>
        </AnimatedPressable>}
      />}
    </View>
    {selected && <PersonGallery person={selected} onClose={() => setSelected(null)} />}
    {editing && <Modal visible animationType="slide" transparent onRequestClose={() => setEditing(null)}><KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} /><View style={[styles.card, { margin: 16, marginBottom: 8, backgroundColor: colors.raised, borderColor: colors.accent }]}><Text style={{ color: colors.ink, fontWeight: '900', marginBottom: 8 }}>Zmień nazwę osoby</Text><Field value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={() => { if (name.trim()) save.mutate(); }} /><View style={{ flexDirection: 'row', gap: 8 }}><Button label="Zapisz" onPress={() => save.mutate()} disabled={!name.trim() || save.isPending} /><Button label="Anuluj" secondary onPress={() => setEditing(null)} /></View></View></KeyboardAvoidingView></Modal>}
  </Screen>;
}

const galleryStyles = {
  photoFrame: { width: '100%' as const, minHeight: 180, borderRadius: 18, overflow: 'hidden' as const, justifyContent: 'center' as const },
};

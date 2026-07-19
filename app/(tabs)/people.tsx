import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deletePerson, getEntityAppearances, getPeople, renamePerson } from '@/api';
import { useTheme } from '@/ThemeContext';
import { router } from 'expo-router';
import { AnimatedBottomSheet, AnimatedPressable, Button, EmptyState, FadeModal, Field, Loading, ModalScreen, Screen, Text, TextInput, TOUCH_TARGET_MIN } from '@/ui';
import type { EntityAppearance, Person, Photo } from '@/types';

type GalleryPhoto = Photo & { appearance?: EntityAppearance };

function BboxImage({ photo, bbox }: { photo: GalleryPhoto; bbox?: number[] | null }) {
  const { colors } = useTheme();
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const scale = Math.min(frame.width / natural.width, frame.height / natural.height);
  const displayed = { width: natural.width * scale, height: natural.height * scale };
  const offset = { x: (frame.width - displayed.width) / 2, y: (frame.height - displayed.height) / 2 };
  const coordinates = bbox && bbox.length >= 4 ? bbox : null;
  let box: { left: number; top: number; width: number; height: number } | null = null;
  if (coordinates) {
    let [x1, y1, x2, y2] = coordinates;
    if (Math.max(...coordinates) <= 1) { x1 *= natural.width; x2 *= natural.width; y1 *= natural.height; y2 *= natural.height; }
    x1 = Math.max(0, Math.min(x1, natural.width)); x2 = Math.max(x1, Math.min(x2, natural.width));
    y1 = Math.max(0, Math.min(y1, natural.height)); y2 = Math.max(y1, Math.min(y2, natural.height));
    if (x2 > x1 && y2 > y1) box = { left: offset.x + x1 * scale, top: offset.y + y1 * scale, width: (x2 - x1) * scale, height: (y2 - y1) * scale };
  }
  return <View onLayout={event => setFrame(event.nativeEvent.layout)} style={[styles.viewerImageFrame, { backgroundColor: colors.soft }]}>
    <Image source={{ uri: `data:${photo.fileType};base64,${photo.imageBase64}` }} resizeMode="contain" style={StyleSheet.absoluteFill} onLoad={event => { const { width, height } = event.nativeEvent.source; if (width && height) setNatural({ width, height }); }} />
    {box && <View pointerEvents="none" style={[styles.bboxOuter, box]}><View style={styles.bboxInner} /></View>}
  </View>;
}

function PhotoViewer({ photos, initialIndex, onClose }: { photos: GalleryPhoto[]; initialIndex: number; onClose: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const list = useRef<FlatList<GalleryPhoto>>(null);
  useEffect(() => { requestAnimationFrame(() => list.current?.scrollToIndex({ index: initialIndex, animated: false })); }, [initialIndex]);
  return <FadeModal onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}><ModalScreen>
    <View style={[styles.viewerHeader, { borderBottomColor: colors.border }]}><Text style={{ color: colors.muted, fontSize: 14 }}>{index + 1} / {photos.length}</Text><Text numberOfLines={1} style={[styles.fileName, { color: colors.ink }]}>{photos[index]?.appearance?.fileName || photos[index]?.fileName}</Text><Pressable onPress={onClose} style={styles.navHit} accessibilityLabel="Zamknij zdjęcie" accessibilityRole="button"><Ionicons name="close" size={25} color={colors.ink} /></Pressable></View>
    <FlatList ref={list} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={photo => photo.path} getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })} onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))} renderItem={({ item }) => <View style={{ width, flex: 1, padding: 16 }}><BboxImage photo={item} bbox={item.appearance?.bbox} /></View>} />
  </ModalScreen></FadeModal>;
}

function PersonGallery({ person, onClose, onRename, onDelete }: { person: Person; onClose: () => void; onRename: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const appearances = useQuery({ queryKey: ['person-appearances', person.id], queryFn: () => getEntityAppearances(person.id) });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const photos = useMemo<GalleryPhoto[]>(() => (person.photos || []).map(photo => ({ ...photo, appearance: appearances.data?.find(item => item.filePath === photo.path) })), [appearances.data, person.photos]);
  return <FadeModal onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}><ModalScreen>
    <View style={[styles.galleryNav, { borderBottomColor: colors.border }]}><Pressable onPress={onClose} style={styles.navHit} accessibilityLabel="Wróć do osób" accessibilityRole="button"><Ionicons name="chevron-back" size={28} color={colors.ink} /></Pressable><Text style={[styles.navTitle, { color: colors.ink }]} numberOfLines={1}>{person.displayName}</Text><Pressable onPress={() => setMenu(true)} style={styles.navHit} accessibilityLabel="Opcje osoby" accessibilityRole="button"><Ionicons name="ellipsis-horizontal" size={24} color={colors.ink} /></Pressable></View>
    {appearances.isLoading ? <Loading label="Ładowanie zdjęć" /> : <FlatList data={photos} keyExtractor={photo => photo.path} numColumns={3} columnWrapperStyle={photos.length ? styles.photoRow : undefined} contentContainerStyle={styles.galleryContent} ListHeaderComponent={<View style={styles.profileHeader}><View style={[styles.profileIcon, { backgroundColor: colors.soft }]}><Ionicons name="person" size={34} color={colors.ink} /></View><Text style={[styles.personName, { color: colors.ink }]}>{person.displayName}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{photos.length} {photos.length === 1 ? 'zdjęcie' : photos.length < 5 ? 'zdjęcia' : 'zdjęć'}</Text><Text style={[styles.photosTitle, { color: colors.ink }]}>Zdjęcia</Text></View>} ListEmptyComponent={<EmptyState icon="👤" title="Brak zdjęć" description="Ta osoba nie ma jeszcze przypisanych zdjęć." />} renderItem={({ item, index }) => <AnimatedPressable onPress={() => setViewerIndex(index)} style={styles.galleryTile} accessibilityLabel={`Otwórz zdjęcie ${index + 1}`}><Image source={{ uri: `data:${item.fileType};base64,${item.imageBase64}` }} resizeMode="cover" style={[styles.galleryImage, { backgroundColor: colors.soft }]} /></AnimatedPressable>} />}
    {menu && <AnimatedBottomSheet onClose={() => setMenu(false)}><Text style={[styles.sheetTitle, { color: colors.ink }]}>Opcje osoby</Text><Pressable style={styles.sheetRow} onPress={() => { setMenu(false); onRename(); }}><Ionicons name="pencil-outline" size={21} color={colors.ink} /><Text style={[styles.sheetLabel, { color: colors.ink }]}>Zmień nazwę</Text></Pressable><Pressable style={styles.sheetRow} onPress={() => { setMenu(false); onDelete(); }}><Ionicons name="trash-outline" size={21} color={colors.danger} /><Text style={[styles.sheetLabel, { color: colors.danger }]}>Usuń rozpoznanie</Text></Pressable></AnimatedBottomSheet>}
    {viewerIndex !== null && <PhotoViewer photos={photos} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
  </ModalScreen></FadeModal>;
}

function RenameSheet({ value, onChange, pending, onClose, onSave }: { value: string; onChange: (value: string) => void; pending: boolean; onClose: () => void; onSave: () => void }) {
  const { colors } = useTheme();
  return <AnimatedBottomSheet onClose={onClose} keyboardAvoiding><Text style={[styles.sheetTitle, { color: colors.ink }]}>Zmień nazwę</Text><Text style={[styles.sheetDescription, { color: colors.muted }]}>Nazwa będzie widoczna przy wszystkich zdjęciach tej osoby.</Text><Field value={value} onChangeText={onChange} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={onSave} placeholder="Imię i nazwisko" /><View style={styles.sheetButtons}><View style={{ flex: 1 }}><Button label="Anuluj" secondary onPress={onClose} /></View><View style={{ flex: 1 }}><Button label={pending ? 'Zapisywanie…' : 'Zapisz'} disabled={!value.trim() || pending} onPress={onSave} /></View></View></AnimatedBottomSheet>;
}

export default function People() {
  const { colors } = useTheme(); const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Person | null>(null); const [editing, setEditing] = useState<Person | null>(null); const [name, setName] = useState(''); const [search, setSearch] = useState('');
  const people = useQuery({ queryKey: ['people'], queryFn: getPeople });
  const rename = useMutation({ mutationFn: () => renamePerson(editing!.id, name.trim()), onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['people'] }); }, onError: () => Alert.alert('Błąd', 'Nie udało się zmienić nazwy osoby.') });
  const remove = useMutation({ mutationFn: () => deletePerson(selected!.id), onSuccess: () => { setSelected(null); queryClient.invalidateQueries({ queryKey: ['people'] }); }, onError: () => Alert.alert('Błąd', 'Nie udało się usunąć rozpoznania.') });
  const visiblePeople = useMemo(() => { const phrase = search.trim().toLocaleLowerCase('pl'); return (people.data || []).filter(person => (person.photos?.length || 0) > 0 && (!phrase || person.displayName.toLocaleLowerCase('pl').includes(phrase))); }, [people.data, search]);
  const openRename = (person: Person) => { setName(person.displayName); setEditing(person); };
  const confirmDelete = () => Alert.alert('Usunąć rozpoznanie?', `Usunięte zostaną dane rozpoznania osoby „${selected?.displayName}”. Oryginalne zdjęcia pozostaną w bibliotece.`, [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń rozpoznanie', style: 'destructive', onPress: () => remove.mutate() }]);
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Osoby</Text>
        <Text style={{ color: colors.muted, marginTop: 3 }}>Rozpoznane twarze w Twojej bibliotece</Text>
        <View style={[styles.search, { backgroundColor: colors.soft }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj osoby"
            placeholderTextColor={colors.muted}
            clearButtonMode="while-editing"
            accessibilityLabel="Szukaj osoby"
            style={[styles.searchInput, { color: colors.ink }]}
          />
        </View>
      </View>
      {people.isLoading ? (
        <Loading />
      ) : people.isError ? (
        <View style={styles.error}><Text style={{ color: colors.danger }}>Nie udało się pobrać osób. Sprawdź adres backendu w ustawieniach.</Text></View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          data={visiblePeople}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={visiblePeople.length ? styles.peopleRow : undefined}
          contentContainerStyle={styles.peopleGrid}
          ListEmptyComponent={
            <EmptyState
              icon="👤"
              title={search ? 'Nie znaleziono osoby' : 'Brak rozpoznanych osób'}
              description={search ? 'Spróbuj wyszukać inną nazwę.' : 'Dodaj zdjęcia do folderów, aby rozpocząć rozpoznawanie.'}
              action={!search ? <Button label="Przejdź do biblioteki" onPress={() => router.push('/(tabs)/folders')} /> : undefined}
            />
          }
          renderItem={({ item }) => (
            <AnimatedPressable onPress={() => setSelected(item)} style={styles.person} accessibilityLabel={`Pokaż zdjęcia osoby ${item.displayName}`}>
              <Image source={{ uri: `data:${item.photos![0].fileType};base64,${item.photos![0].imageBase64}` }} resizeMode="cover" style={[styles.avatar, { backgroundColor: colors.soft }]} />
              <View style={styles.personText}>
                <Text numberOfLines={1} style={[styles.personLabel, { color: colors.ink }]}>{item.displayName}</Text>
                <Text numberOfLines={1} style={[styles.personCount, { color: colors.muted }]}>{item.photos?.length || 0} zdjęć</Text>
              </View>
            </AnimatedPressable>
          )}
        />
      )}
      {selected && <PersonGallery person={selected} onClose={() => setSelected(null)} onRename={() => openRename(selected)} onDelete={confirmDelete} />}
      {editing && <RenameSheet value={name} onChange={setName} pending={rename.isPending} onClose={() => setEditing(null)} onSave={() => name.trim() && rename.mutate()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -.8 },
  search: { marginTop: 18, minHeight: TOUCH_TARGET_MIN, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 7, paddingVertical: 0, minHeight: TOUCH_TARGET_MIN },
  peopleGrid: { paddingHorizontal: 16, paddingBottom: 110, flexGrow: 1 },
  peopleRow: { gap: 14 },
  person: { flex: 1, minWidth: 0, marginBottom: 23 },
  avatar: { width: '100%', aspectRatio: 1, borderRadius: 15 },
  personText: { paddingHorizontal: 2, paddingTop: 8 },
  personLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -.15 },
  personCount: { fontSize: 13, marginTop: 2 },
  error: { padding: 20 },
  galleryNav: { minHeight: TOUCH_TARGET_MIN + 8, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontWeight: '700', fontSize: 17, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  galleryContent: { paddingBottom: 34 },
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  profileIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  personName: { fontSize: 25, fontWeight: '800', letterSpacing: -.5 },
  photosTitle: { alignSelf: 'flex-start', fontSize: 21, fontWeight: '800', marginTop: 31, marginLeft: 16 },
  photoRow: { gap: 2, paddingHorizontal: 2 },
  galleryTile: { flex: 1, minWidth: 0, marginBottom: 2 },
  galleryImage: { width: '100%', aspectRatio: 1, borderRadius: 4 },
  viewerHeader: { minHeight: TOUCH_TARGET_MIN + 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileName: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
  viewerImageFrame: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  bboxOuter: { position: 'absolute', borderColor: '#000', borderWidth: 3, borderRadius: 4, padding: 2 },
  bboxInner: { flex: 1, borderColor: '#fff', borderWidth: 1, borderRadius: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 5 },
  sheetDescription: { lineHeight: 20, marginBottom: 16 },
  sheetRow: { minHeight: TOUCH_TARGET_MIN + 10, alignItems: 'center', flexDirection: 'row', gap: 13 },
  sheetLabel: { fontSize: 16, fontWeight: '600' },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  navHit: { minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' },
});

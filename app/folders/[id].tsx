import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmMention, deleteFiles, detectFaces, getFileEmbeddings, getFiles, getMentions, getPeople, getPreview, renameFile, renameMention, resolveFaceBatch, uploadFile } from '@/api';
import type { FileItem, Mention, Person } from '@/types';
import { AnimatedPressable, AnimatedBottomSheet, Button, EmptyState, FadeModal, Field, Header, IconButton, Loading, ModalScreen, Screen, SearchField, SectionTitle, SegmentedControl, Surface, Text, ToolbarIconButton, TOUCH_TARGET_MIN } from '@/ui';
import { useTheme } from '@/ThemeContext';

type ViewMode = 'list' | 'grid';
type FileSort = 'nameAsc' | 'nameDesc' | 'type';
const isImage = (type: string) => type.toLowerCase().startsWith('image/');

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <AnimatedBottomSheet onClose={onClose}>{children}</AnimatedBottomSheet>;
}

function ActionRow({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? .55 : 1 }]}><Ionicons name={icon} size={21} color={danger ? colors.danger : colors.accent} /><Text style={{ color: danger ? colors.danger : colors.ink, fontSize: 16, fontWeight: '700' }}>{label}</Text></Pressable>;
}

function BboxImage({ uri, mentions, onSelect }: { uri: string; mentions: Mention[]; onSelect: (mention: Mention) => void }) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 1, h: 1 });
  return <View style={{ width: '100%', aspectRatio: size.w / size.h, maxHeight: 460, borderRadius: 18, overflow: 'hidden', backgroundColor: '#15171d', justifyContent: 'center' }}><Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} onLoad={event => setSize({ w: event.nativeEvent.source.width, h: event.nativeEvent.source.height })} />{mentions.map(mention => {
    if (!mention.bbox || mention.bbox.length < 4) return null;
    const [x1, y1, x2, y2] = mention.bbox;
    return <Pressable key={mention.id} onPress={() => onSelect(mention)} accessibilityLabel={`Wybierz ${mention.entityDisplayName || mention.label}`} style={{ position: 'absolute', left: `${x1 / size.w * 100}%`, top: `${y1 / size.h * 100}%`, width: `${(x2 - x1) / size.w * 100}%`, height: `${(y2 - y1) / size.h * 100}%`, borderWidth: 2, borderColor: colors.accent, backgroundColor: 'rgba(33,85,229,.16)', borderRadius: 4 }} />;
  })}</View>;
}

function FilePreview({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const { colors } = useTheme();
  const [content, setContent] = useState<{ kind: string; content: string } | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Mention | null>(null);
  const [name, setName] = useState('');
  useEffect(() => { let active = true; Promise.all([getPreview(file.path), getMentions(file.path), getPeople()]).then(async ([preview, initial, entities]) => {
    const resolved = initial.some(item => !item.bbox || item.bbox.length < 4) && initial.length ? await detectFaces(file.path).catch(() => initial) : initial;
    if (active) { setContent(preview); setMentions(resolved); setPeople(entities); }
  }).catch(() => active && Alert.alert('Błąd', 'Nie udało się otworzyć pliku.')); return () => { active = false; }; }, [file.path]);
  const selectMention = (mention: Mention) => { setSelected(mention); setName(mention.entityDisplayName || mention.label); };
  const save = async () => { if (!selected || !name.trim()) return; const existing = people.find(person => person.displayName.toLocaleLowerCase('pl-PL') === name.trim().toLocaleLowerCase('pl-PL')); await (existing ? confirmMention(selected.id, existing.id) : renameMention(selected.id, name.trim())); setMentions(await getMentions(file.path)); setSelected(null); setName(''); };
  return <FadeModal onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}><ModalScreen><Header title={file.name} onBack={onClose} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 34 }}>{!content ? <Loading label="Otwieranie pliku" /> : content.kind === 'image' ? <BboxImage uri={content.content} mentions={mentions} onSelect={selectMention} /> : <Surface><Text selectable style={{ color: colors.ink, fontSize: 15, lineHeight: 24 }}>{content.content}</Text></Surface>}{content?.kind === 'image' && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Dotknij zaznaczonej twarzy, aby ją podpisać.</Text>}{mentions.length > 0 && <><SectionTitle>Osoby na zdjęciu</SectionTitle><View style={{ backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14 }}>{mentions.map((mention, index) => <Pressable key={mention.id} onPress={() => selectMention(mention)} style={{ minHeight: 61, justifyContent: 'center', borderBottomWidth: index === mentions.length - 1 ? 0 : 1, borderBottomColor: colors.border }}><Text style={{ color: colors.ink, fontWeight: '700' }}>{mention.entityDisplayName || mention.label || `Osoba ${index + 1}`}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{mention.visualCues || 'Dotknij, aby przypisać nazwę'}</Text></Pressable>)}</View></>}{selected && <Surface style={{ marginTop: 18, borderColor: colors.accent }}><Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 5 }}>Podpisz osobę</Text><Text style={{ color: colors.muted, marginBottom: 13 }}>Nadaj nazwę albo wybierz istniejącą osobę.</Text><Field value={name} onChangeText={setName} placeholder="Imię i nazwisko" returnKeyType="done" onSubmitEditing={() => save().catch(() => Alert.alert('Błąd', 'Nie udało się zapisać nazwy.'))} /><View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Button label="Anuluj" secondary onPress={() => setSelected(null)} /></View><View style={{ flex: 1 }}><Button label="Zapisz" onPress={() => save().catch(() => Alert.alert('Błąd', 'Nie udało się zapisać nazwy.'))} disabled={!name.trim()} /></View></View></Surface>}</ScrollView></KeyboardAvoidingView></ModalScreen></FadeModal>;
}

function EmbeddingsModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const { colors } = useTheme();
  const embeddings = useQuery({ queryKey: ['embeddings', file.path], queryFn: () => getFileEmbeddings(file.path) });
  return <FadeModal onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}><ModalScreen><Header title="Embeddingi" subtitle={file.name} onBack={onClose} />{embeddings.isLoading ? <Loading label="Ładowanie embeddingów" /> : embeddings.isError ? <Text style={{ color: colors.danger, padding: 16 }}>Nie udało się pobrać embeddingów.</Text> : <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}><Surface><Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Fragmentów: {embeddings.data?.chunkCount}</Text><Text selectable style={{ color: colors.ink, lineHeight: 22 }}>{embeddings.data?.content}</Text></Surface></ScrollView>}</ModalScreen></FadeModal>;
}

function FileRow({ item, onOpen, onMore }: { item: FileItem; onOpen: () => void; onMore: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onOpen} style={{ minHeight: 76, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }} accessibilityLabel={`Otwórz ${item.name}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {isImage(item.type) && item.url ? <Image source={{ uri: item.url }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Ionicons name={isImage(item.type) ? 'image-outline' : 'document-text-outline'} size={24} color={colors.accent} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{item.extractedText || (isImage(item.type) ? 'Zdjęcie' : item.type.includes('pdf') ? 'Dokument PDF' : 'Dokument')}</Text>
        </View>
        <Pressable
          onPress={event => { event.stopPropagation(); onMore(); }}
          style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={`Opcje pliku ${item.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="ellipsis-horizontal" size={21} color={colors.muted} />
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

function FileTile({ item, onOpen, onMore }: { item: FileItem; onOpen: () => void; onMore: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onOpen} style={{ flex: 1, minWidth: 0, marginBottom: 14 }} accessibilityLabel={`Otwórz ${item.name}`}>
      <View>
        <View style={{ width: '100%', aspectRatio: 1, borderRadius: 15, overflow: 'hidden', backgroundColor: isImage(item.type) ? colors.sidebar : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          {isImage(item.type) && item.url ? <Image source={{ uri: item.url }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Ionicons name="document-text-outline" size={30} color={colors.accent} />}
          <Pressable
            onPress={event => { event.stopPropagation(); onMore(); }}
            style={{ position: 'absolute', right: 4, top: 4, height: TOUCH_TARGET_MIN, width: TOUCH_TARGET_MIN, borderRadius: TOUCH_TARGET_MIN / 2, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={`Opcje pliku ${item.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', marginTop: 7 }}>{item.name}</Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{isImage(item.type) ? 'Zdjęcie' : item.type.includes('pdf') ? 'PDF' : 'Dokument'}</Text>
      </View>
    </AnimatedPressable>
  );
}

export default function FolderDetail() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<FileSort>('nameAsc');
  const [adding, setAdding] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [actions, setActions] = useState<FileItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [embeddingFile, setEmbeddingFile] = useState<FileItem | null>(null);
  const files = useQuery({ queryKey: ['files', params.id], queryFn: () => getFiles(params.id) });
  const upload = useMutation({ mutationFn: (asset: { uri: string; name: string; mimeType?: string }) => uploadFile(params.id, asset), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files', params.id] }) });
  const rename = useMutation({ mutationFn: () => renameFile(renameTarget!.path, renameValue.trim()), onSuccess: () => { setRenameTarget(null); queryClient.invalidateQueries({ queryKey: ['files', params.id] }); }, onError: () => Alert.alert('Błąd', 'Nie udało się zmienić nazwy pliku.') });
  const visibleFiles = useMemo(() => [...(files.data || [])].filter(file => !query.trim() || `${file.name} ${file.extractedText || ''}`.toLocaleLowerCase('pl-PL').includes(query.trim().toLocaleLowerCase('pl-PL'))).sort((a, b) => sort === 'type' ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'pl') : sort === 'nameDesc' ? b.name.localeCompare(a.name, 'pl') : a.name.localeCompare(b.name, 'pl')), [files.data, query, sort]);
  const choose = async (kind: 'gallery' | 'camera' | 'files') => { try { let assets: { uri: string; name: string; mimeType?: string }[] = []; if (kind === 'gallery') { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert('Brak dostępu', 'Zezwól na dostęp do zdjęć w Ustawieniach.'); const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: .9 }); if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `zdjecie-${Date.now()}.jpg`, mimeType: asset.mimeType })); } else if (kind === 'camera') { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) return Alert.alert('Brak dostępu', 'Zezwól na dostęp do aparatu w Ustawieniach.'); const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: .9 }); if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `aparat-${Date.now()}.jpg`, mimeType: asset.mimeType })); } else { const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: ['image/*', 'application/pdf', 'text/plain'] }); if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType })); } for (const asset of assets) await upload.mutateAsync(asset); if (assets.length) await resolveFaceBatch((await getFiles(params.id)).filter(file => isImage(file.type)).map(file => file.path)); } catch { Alert.alert('Błąd uploadu', 'Nie udało się dodać pliku.'); } finally { setAdding(false); } };
  const remove = (file: FileItem) => Alert.alert('Usunąć plik?', file.name, [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń', style: 'destructive', onPress: () => deleteFiles([file.path]).then(() => queryClient.invalidateQueries({ queryKey: ['files', params.id] })).catch(() => Alert.alert('Błąd', 'Nie udało się usunąć pliku.')) }]);
  const openAction = (file: FileItem, action: 'rename' | 'embeddings' | 'delete') => { setActions(null); if (action === 'rename') { setRenameTarget(file); setRenameValue(file.name.replace(/\.[^/.]+$/, '')); } if (action === 'embeddings') setEmbeddingFile(file); if (action === 'delete') remove(file); };

  return (
    <Screen>
      <Header title={params.name || 'Folder'} onBack={() => router.back()} action={<IconButton icon="add" label="Dodaj plik" onPress={() => setAdding(true)} />} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Szukaj w folderze" />
        <View style={{ marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{visibleFiles.length} {visibleFiles.length === 1 ? 'plik' : visibleFiles.length < 5 ? 'pliki' : 'plików'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ToolbarIconButton icon="swap-vertical-outline" label="Sortuj pliki" onPress={() => setSorting(true)} />
            <SegmentedControl value={view} onChange={setView} options={[{ value: 'list', label: '', icon: 'list' }, { value: 'grid', label: '', icon: 'grid-outline' }]} />
          </View>
        </View>
      </View>
      {files.isLoading ? (
        <Loading />
      ) : files.isError ? (
        <Text style={{ color: colors.danger, padding: 16 }}>Nie udało się pobrać plików.</Text>
      ) : (
        <FlatList
          key={view}
          data={visibleFiles}
          keyExtractor={file => file.path}
          numColumns={view === 'grid' ? 2 : 1}
          columnWrapperStyle={view === 'grid' ? { gap: 12 } : undefined}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 34, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon={query ? '🔎' : '📄'}
              title={query ? 'Brak wyników' : 'Pusty folder'}
              description={query ? 'Spróbuj innego słowa.' : 'Dodaj zdjęcie, dokument lub plik tekstowy.'}
              action={!query ? <Button label="Dodaj plik" onPress={() => setAdding(true)} /> : undefined}
            />
          }
          renderItem={({ item }) =>
            view === 'grid'
              ? <FileTile item={item} onOpen={() => setPreview(item)} onMore={() => setActions(item)} />
              : <FileRow item={item} onOpen={() => setPreview(item)} onMore={() => setActions(item)} />
          }
        />
      )}
      {upload.isPending && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 22, backgroundColor: colors.ink, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'center' }}>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}>Dodawanie plików…</Text>
        </View>
      )}
      {adding && (
        <Sheet onClose={() => setAdding(false)}>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Dodaj do folderu</Text>
          <Text style={{ color: colors.muted, marginBottom: 14 }}>Wybierz źródło pliku.</Text>
          <ActionRow icon="images-outline" label="Galeria zdjęć" onPress={() => choose('gallery')} />
          <ActionRow icon="camera-outline" label="Aparat" onPress={() => choose('camera')} />
          <ActionRow icon="document-outline" label="Pliki" onPress={() => choose('files')} />
        </Sheet>
      )}
      {actions && (
        <Sheet onClose={() => setActions(null)}>
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 3 }}>Opcje pliku</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, marginBottom: 14 }}>{actions.name}</Text>
          <ActionRow icon="create-outline" label="Zmień nazwę" onPress={() => openAction(actions, 'rename')} />
          <ActionRow icon="analytics-outline" label="Pokaż embeddingi" onPress={() => openAction(actions, 'embeddings')} />
          <ActionRow icon="trash-outline" label="Usuń plik" danger onPress={() => openAction(actions, 'delete')} />
        </Sheet>
      )}
      {sorting && (
        <Sheet onClose={() => setSorting(false)}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Sortuj pliki</Text>
          {([{ key: 'nameAsc', label: 'Nazwa: A–Z' }, { key: 'nameDesc', label: 'Nazwa: Z–A' }, { key: 'type', label: 'Typ pliku' }] as { key: FileSort; label: string }[]).map(option => (
            <Pressable
              key={option.key}
              onPress={() => { setSort(option.key); setSorting(false); }}
              style={{ minHeight: TOUCH_TARGET_MIN + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === option.key }}
            >
              <Text style={{ color: colors.ink, fontSize: 16 }}>{option.label}</Text>
              {sort === option.key && <Ionicons name="checkmark" size={21} color={colors.accent} />}
            </Pressable>
          ))}
        </Sheet>
      )}
      {renameTarget && (
        <AnimatedBottomSheet onClose={() => setRenameTarget(null)} keyboardAvoiding>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 14 }}>Zmień nazwę pliku</Text>
          <Field value={renameValue} onChangeText={setRenameValue} autoFocus returnKeyType="done" onSubmitEditing={() => renameValue.trim() && rename.mutate()} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button label="Anuluj" secondary onPress={() => setRenameTarget(null)} /></View>
            <View style={{ flex: 1 }}><Button label="Zapisz" onPress={() => rename.mutate()} disabled={!renameValue.trim() || rename.isPending} /></View>
          </View>
        </AnimatedBottomSheet>
      )}
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
      {embeddingFile && <EmbeddingsModal file={embeddingFile} onClose={() => setEmbeddingFile(null)} />}
    </Screen>
  );
}

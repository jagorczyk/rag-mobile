import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmMention, deleteFiles, detectFaces, getFiles, getMentions, getPeople, getPreview, renameMention, resolveFaceBatch, uploadFile } from '@/api';
import type { FileItem, Mention, Person } from '@/types';
import { useTheme } from '@/ThemeContext';
import { Button, Field, Header, Loading, ModalScreen, Screen, styles } from '@/ui';

const isImage = (type: string) => type.toLowerCase().startsWith('image/');

function BboxImage({ uri, mentions, onSelect }: { uri: string; mentions: Mention[]; onSelect: (mention: Mention) => void }) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 1, h: 1 });
  return <View style={{ alignSelf: 'center', width: '100%', aspectRatio: size.w / size.h, maxHeight: 390, backgroundColor: '#111' }}>
    <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} onLoad={event => setSize({ w: event.nativeEvent.source.width, h: event.nativeEvent.source.height })} />
    {mentions.map((mention, index) => {
      if (!mention.bbox || mention.bbox.length < 4) return null;
      const [x1, y1, x2, y2] = mention.bbox;
      return <Pressable key={mention.id} onPress={() => onSelect(mention)} style={{ position: 'absolute', left: `${x1 / size.w * 100}%`, top: `${y1 / size.h * 100}%`, width: `${(x2 - x1) / size.w * 100}%`, height: `${(y2 - y1) / size.h * 100}%`, borderWidth: 2, borderColor: index % 2 ? '#F4A340' : colors.accent, backgroundColor: 'rgba(33,85,229,.16)' }} />;
    })}
  </View>;
}

function AddAction({ icon, label, onPress, secondary = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; secondary?: boolean }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Dodaj z ${label}`} style={({ pressed }) => [{ flex: 1, minHeight: 82, borderRadius: 12, borderWidth: 1, borderColor: secondary ? colors.border : colors.accent, backgroundColor: secondary ? colors.raised : colors.accentSoft, alignItems: 'center', justifyContent: 'center', gap: 5, opacity: pressed ? .65 : 1 }]}>
    <View><Ionicons name={icon} size={28} color={colors.accent} /><View style={{ position: 'absolute', right: -8, bottom: -3, backgroundColor: colors.accent, borderRadius: 9, width: 17, height: 17, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={14} color="#fff" /></View></View>
    <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700' }}>{label}</Text>
  </Pressable>;
}

function Preview({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const { colors } = useTheme();
  const [preview, setPreview] = useState<{ kind: string; content: string } | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [selected, setSelected] = useState<Mention | null>(null);
  const [name, setName] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const swipe = PanResponder.create({ onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy), onPanResponderRelease: (_, gesture) => { if (gesture.dx > 80) onClose(); } });

  useEffect(() => {
    Promise.all([getPreview(file.path), getMentions(file.path), getPeople()]).then(async ([data, initialMentions, entities]) => {
      const resolved = initialMentions.some(item => !item.bbox || item.bbox.length < 4) && initialMentions.length > 0 ? await detectFaces(file.path).catch(() => initialMentions) : initialMentions;
      setPreview(data); setMentions(resolved); setPeople(entities);
    }).catch(() => Alert.alert('BÄąâ€šĂ„â€¦d', 'Nie udaÄąâ€šo siĂ„â„˘ otworzyĂ„â€ˇ pliku.'));
  }, [file.path]);

  const save = async () => {
    if (!selected || !name.trim()) return;
    const existing = people.find(person => person.displayName.toLowerCase() === name.trim().toLowerCase());
    await (existing ? confirmMention(selected.id, existing.id) : renameMention(selected.id, name.trim()));
    setMentions(await getMentions(file.path)); setSelected(null); setName('');
  };

  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}><SafeAreaProvider><ModalScreen><View style={{ flex: 1 }} {...swipe.panHandlers}><Header title={file.name} action={<Pressable onPress={onClose} accessibilityLabel="Zamknij podglĂ„â€¦d"><Ionicons name="close" size={28} color={colors.ink} /></Pressable>} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>{!preview ? <Loading /> : preview.kind === 'image' ? <BboxImage uri={preview.content} mentions={mentions} onSelect={mention => { setSelected(mention); setName(mention.entityDisplayName || mention.label); }} /> : <Text style={{ color: colors.ink, lineHeight: 23 }}>{preview.content}</Text>}{mentions.length > 0 && <View style={{ marginTop: 18 }}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Osoby na zdjĂ„â„˘ciu</Text>{mentions.map((mention, index) => <Pressable key={mention.id} onPress={() => { setSelected(mention); setName(mention.entityDisplayName || mention.label); }} style={[styles.card, { backgroundColor: colors.raised, borderColor: index % 2 ? '#F4A340' : colors.accent }]}><Text style={{ color: colors.ink, fontWeight: '700' }}>Osoba {index + 1}: {mention.entityDisplayName || mention.label}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{mention.visualCues || 'Brak dodatkowego opisu'}</Text></Pressable>)}</View>}{selected && <View style={[styles.card, { backgroundColor: colors.raised, borderColor: colors.accent }]}><Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Podpisz osobĂ„â„˘</Text><Field value={name} onChangeText={setName} placeholder="ImiĂ„â„˘ lub nazwa osoby" returnKeyType="done" /><View style={{ flexDirection: 'row', gap: 8 }}><Button label="Zapisz" onPress={() => save().catch(() => Alert.alert('BÄąâ€šĂ„â€¦d', 'Nie udaÄąâ€šo siĂ„â„˘ zapisaĂ„â€ˇ.'))} /><Button label="Anuluj" secondary onPress={() => setSelected(null)} /></View></View>}</ScrollView></KeyboardAvoidingView></View></ModalScreen></SafeAreaProvider></Modal>;
}

export default function FolderDetail() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<FileItem | null>(null);
  const files = useQuery({ queryKey: ['files', params.id], queryFn: () => getFiles(params.id) });
  const upload = useMutation({ mutationFn: (asset: { uri: string; name: string; mimeType?: string }) => uploadFile(params.id, asset), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files', params.id] }) });

  const choose = async (kind: 'gallery' | 'camera' | 'files') => {
    try {
      let assets: { uri: string; name: string; mimeType?: string }[] = [];
      if (kind === 'gallery') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return Alert.alert('Brak dostĂ„â„˘pu', 'ZezwÄ‚Ĺ‚l na dostĂ„â„˘p do zdjĂ„â„˘Ă„â€ˇ w Ustawieniach.');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: .9 });
        if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `zdjecie-${Date.now()}.jpg`, mimeType: asset.mimeType }));
      } else if (kind === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert('Brak dostĂ„â„˘pu', 'ZezwÄ‚Ĺ‚l na dostĂ„â„˘p do aparatu w Ustawieniach.');
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: .9 });
        if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `aparat-${Date.now()}.jpg`, mimeType: asset.mimeType }));
      } else {
        const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: ['image/*', 'application/pdf', 'text/plain'] });
        if (!result.canceled) assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }));
      }
      for (const asset of assets) await upload.mutateAsync(asset);
      if (assets.length) await resolveFaceBatch((await getFiles(params.id)).filter(file => isImage(file.type)).map(file => file.path));
    } catch { Alert.alert('BÄąâ€šĂ„â€¦d uploadu', 'Nie udaÄąâ€šo siĂ„â„˘ dodaĂ„â€ˇ pliku.'); }
  };

  const remove = (file: FileItem) => Alert.alert('UsuÄąâ€ž plik', file.name, [{ text: 'Anuluj', style: 'cancel' }, { text: 'UsuÄąâ€ž', style: 'destructive', onPress: () => deleteFiles([file.path]).then(() => queryClient.invalidateQueries({ queryKey: ['files', params.id] })) }]);

  return <Screen><Header title={params.name || 'Folder'} action={<Pressable onPress={() => router.back()} accessibilityLabel="WrÄ‚Ĺ‚Ă„â€ˇ"><Ionicons name="chevron-back" size={28} color={colors.ink} /></Pressable>} /><View style={styles.content}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 8 }}>Dodaj do folderu</Text><View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}><AddAction icon="images-outline" label="Galeria" onPress={() => choose('gallery')} /><AddAction icon="camera-outline" label="Aparat" onPress={() => choose('camera')} secondary /><AddAction icon="document-outline" label="Pliki" onPress={() => choose('files')} secondary /></View>{files.isLoading ? <Loading /> : <FlatList style={{ flex: 1 }} data={files.data} keyExtractor={file => file.path} contentContainerStyle={{ paddingBottom: 20 }} ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>Pusty folder</Text>} renderItem={({ item }) => <Pressable onPress={() => setPreview(item)} style={[styles.card, { backgroundColor: colors.raised, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}><View style={{ width: 54, height: 54, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.accentSoft, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>{isImage(item.type) && item.url ? <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name={isImage(item.type) ? 'image-outline' : 'document-text-outline'} size={25} color={colors.accent} />}</View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700' }}>{item.name}</Text>{item.extractedText && <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.extractedText}</Text>}</View><Pressable onPress={() => remove(item)} hitSlop={8} accessibilityLabel={`UsuÄąâ€ž ${item.name}`}><Ionicons name="trash-outline" color={colors.danger} size={20} /></Pressable></Pressable>} />}</View>{preview && <Preview file={preview} onClose={() => setPreview(null)} />}</Screen>;
}



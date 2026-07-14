import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getMessages, getPreview, sendMessage } from '@/api';
import { useTheme } from '@/ThemeContext';
import { Button, Field, Header, Loading, Screen } from '@/ui';
import type { Message, Source } from '@/types';

function SourcePreview({ source, onClose }: { source: Source; onClose: () => void }) {
  const { colors } = useTheme();
  const [content, setContent] = useState<{ kind: string; value: string } | null>(source.base64 ? { kind: 'image', value: `data:image/${source.fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'};base64,${source.base64}` } : null);
  useEffect(() => { if (!content) getPreview(source.path).then(result => setContent({ kind: result.kind, value: result.content })).catch(() => setContent({ kind: 'other', value: 'Nie udało się otworzyć źródła.' })); }, [source.path, content]);
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}><Screen><Header title={source.fileName} action={<Pressable onPress={onClose} accessibilityLabel="Zamknij źródło"><Ionicons name="close" size={28} color={colors.ink} /></Pressable>} /><ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: content ? 'flex-start' : 'center' }}>{!content ? <ActivityIndicator color={colors.accent} size="large" /> : content.kind === 'image' ? <Image source={{ uri: content.value }} resizeMode="contain" style={{ width: '100%', height: 420, backgroundColor: '#111' }} /> : <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 24 }}>{content.value}</Text>}</ScrollView></Screen></Modal>;
}

function SourceChip({ source, onPress }: { source: Source; onPress: () => void }) {
  const { colors } = useTheme();
  const icon = source.type === 'IMAGE' ? 'image-outline' : source.type === 'PDF' ? 'document-text-outline' : 'attach-outline';
  return <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, marginTop: 6, marginRight: 6, opacity: pressed ? .6 : 1 }]}><Ionicons name={icon} size={15} color={colors.accent} /><Text numberOfLines={1} style={{ color: colors.accent, fontSize: 12, fontWeight: '700', maxWidth: 190 }}>{source.fileName}</Text></Pressable>;
}

export default function ChatDetail() {
  const { colors } = useTheme(); const { id } = useLocalSearchParams<{ id: string }>(); const [input, setInput] = useState(''); const [source, setSource] = useState<Source | null>(null); const list = useRef<FlatList>(null);
  const messages = useQuery({ queryKey: ['messages', id], queryFn: () => getMessages(id), enabled: !!id });
  const send = useMutation({ mutationFn: () => sendMessage(id, input.trim()), onSuccess: () => { setInput(''); messages.refetch(); } });
  const items: Message[] = [...(messages.data || []), ...(send.isPending ? [{ id: 'pending', role: 'assistant' as const, content: '…' }] : [])];
  return <Screen><Header title="Rozmowa" action={<Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={colors.ink} /></Pressable>} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}><FlatList ref={list} keyboardShouldPersistTaps="handled" data={items} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })} ListEmptyComponent={messages.isLoading ? <Loading /> : <Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>Napisz pierwszą wiadomość.</Text>} renderItem={({ item }) => <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start' }}><View style={{ maxWidth: '88%', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: item.role === 'user' ? colors.raised : colors.sidebar }}><Text style={{ color: colors.ink, lineHeight: 22 }}>{item.content}</Text>{item.uncertain && <Text style={{ color: '#B07010', fontSize: 12, marginTop: 6 }}>Odpowiedź może być niepewna.</Text>}</View>{item.sources && <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{item.sources.map((itemSource: Source, index: number) => <SourceChip key={`${itemSource.path}-${index}`} source={itemSource} onPress={() => setSource(itemSource)} />)}</View>}</View>} /><View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.raised, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><Field value={input} onChangeText={setInput} placeholder="Napisz wiadomość…" multiline style={{ flex: 1, maxHeight: 110, marginBottom: 0 }} /><Button label="Wyślij" onPress={() => send.mutate()} disabled={!input.trim() || send.isPending} /></View></KeyboardAvoidingView>{source && <SourcePreview source={source} onClose={() => setSource(null)} />}</Screen>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessages, getPreview, sendMessage } from '@/api';
import { useTheme } from '@/ThemeContext';
import { AnimatedBottomSheet, FadeModal, Loading, ModalScreen, Screen, Text, TextInput, TOUCH_TARGET_MIN } from '@/ui';
import type { Message, Source } from '@/types';

function sourceIcon(source: Source) { return source.type === 'IMAGE' ? 'image-outline' : source.type === 'PDF' ? 'document-text-outline' : 'document-outline'; }

function SourcePreview({ source, onClose }: { source: Source; onClose: () => void }) {
  const { colors } = useTheme();
  const [content, setContent] = useState<{ kind: string; value: string } | null>(source.base64 ? { kind: 'image', value: `data:image/${source.fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'};base64,${source.base64}` } : null);
  useEffect(() => {
    if (content) return;
    getPreview(source.path).then(result => setContent({ kind: result.kind, value: result.content })).catch(() => setContent({ kind: 'other', value: 'Nie udało się otworzyć źródła.' }));
  }, [content, source.path]);
  return <FadeModal onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}><SafeAreaProvider><ModalScreen>
    <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}><Pressable onPress={onClose} style={styles.navHit} accessibilityLabel="Gotowe" accessibilityRole="button"><Text style={{ color: colors.accent, fontSize: 17 }}>Gotowe</Text></Pressable><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 17, fontWeight: '700', maxWidth: '68%' }}>{source.fileName}</Text><View style={{ width: TOUCH_TARGET_MIN }} /></View>
    <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: content ? 'flex-start' : 'center' }}>{!content ? <ActivityIndicator color={colors.accent} size="large" /> : content.kind === 'image' ? <Image source={{ uri: content.value }} resizeMode="contain" style={{ width: '100%', height: 460, backgroundColor: '#111827' }} /> : <Text selectable style={{ color: colors.ink, fontSize: 15, lineHeight: 24 }}>{content.value}</Text>}</ScrollView>
  </ModalScreen></SafeAreaProvider></FadeModal>;
}

function SourceSheet({ sources, onClose, onSelect }: { sources: Source[]; onClose: () => void; onSelect: (source: Source) => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedBottomSheet onClose={onClose} contentStyle={{ backgroundColor: colors.surface }}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: colors.ink }]}>Źródła ({sources.length})</Text>
        <Pressable onPress={onClose} style={styles.navHit} accessibilityLabel="Zamknij źródła" accessibilityRole="button">
          <Ionicons name="close" size={23} color={colors.muted} />
        </Pressable>
      </View>
      {sources.map((item, index) => (
        <Pressable
          key={`${item.path}-${index}`}
          onPress={() => onSelect(item)}
          accessibilityRole="button"
          accessibilityLabel={`Otwórz ${item.fileName}`}
          style={({ pressed }) => [styles.sourceRow, { borderBottomColor: colors.border, opacity: pressed ? .55 : 1 }]}
        >
          <View style={[styles.sourceIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={sourceIcon(item)} size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700' }}>{item.fileName}</Text>
            <Text style={{ color: colors.muted, marginTop: 3, fontSize: 13 }}>Otwórz podgląd</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </AnimatedBottomSheet>
  );
}

function TypingIndicator() {
  const { colors } = useTheme(); const pulse = useRef(new Animated.Value(.35)).current;
  useEffect(() => { const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(pulse, { toValue: .35, duration: 700, useNativeDriver: true })])); loop.start(); return () => loop.stop(); }, [pulse]);
  return <Animated.View style={{ opacity: pulse, flexDirection: 'row', gap: 4, paddingVertical: 7 }}><View style={[styles.dot, { backgroundColor: colors.accent }]} /><View style={[styles.dot, { backgroundColor: colors.accent }]} /><View style={[styles.dot, { backgroundColor: colors.accent }]} /></Animated.View>;
}

export default function ChatDetail() {
  const { colors } = useTheme(); const { id } = useLocalSearchParams<{ id: string }>(); const qc = useQueryClient();
  const [input, setInput] = useState(''); const [previewSource, setPreviewSource] = useState<Source | null>(null); const [sheetSources, setSheetSources] = useState<Source[] | null>(null); const list = useRef<FlatList<Message>>(null);
  const messages = useQuery({ queryKey: ['messages', id], queryFn: () => getMessages(id), enabled: !!id });
  const send = useMutation({
    mutationFn: (message: string) => sendMessage(id, message),
    onSuccess: () => { setInput(''); qc.invalidateQueries({ queryKey: ['messages', id] }); qc.invalidateQueries({ queryKey: ['chats'] }); },
  });
  const items = useMemo<Message[]>(() => [...(messages.data || []), ...(send.isPending ? [{ id: 'pending', role: 'assistant' as const, content: '' }] : [])], [messages.data, send.isPending]);
  const submit = () => { const value = input.trim(); if (value && !send.isPending) send.mutate(value); };
  return <Screen>
    <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} style={styles.navHit} accessibilityLabel="Wróć" accessibilityRole="button"><Ionicons name="chevron-back" size={28} color={colors.accent} /></Pressable><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>Rozmowa</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 1 }}>{send.isPending ? 'Analizuję dokumenty…' : 'Twoja baza wiedzy'}</Text></View><View style={{ width: TOUCH_TARGET_MIN }} /></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <FlatList ref={list} data={items} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.messageList, items.length === 0 && { flexGrow: 1 }]} onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })} ListEmptyComponent={messages.isLoading ? <Loading /> : messages.isError ? <View style={styles.empty}><Ionicons name="cloud-offline-outline" size={30} color={colors.danger} /><Text style={{ color: colors.danger, marginTop: 8, textAlign: 'center' }}>Nie udało się pobrać wiadomości.</Text></View> : <View style={styles.empty}><View style={[styles.welcomeIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="sparkles-outline" size={27} color={colors.accent} /></View><Text style={[styles.welcomeTitle, { color: colors.ink }]}>W czym mogę pomóc?</Text><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 7, lineHeight: 20 }}>Zapytaj o informacje z dodanych dokumentów.</Text></View>} renderItem={({ item }) => <View style={[styles.messageWrap, { alignItems: item.role === 'user' ? 'flex-end' : 'flex-start' }]}>
        {item.id === 'pending' ? <TypingIndicator /> : <View style={item.role === 'user' ? [styles.userBubble, { backgroundColor: colors.accent }] : styles.assistantMessage}><Text style={{ color: item.role === 'user' ? '#fff' : colors.ink, fontSize: 16, lineHeight: 23 }}>{item.content}</Text>{item.uncertain && <Text style={{ color: colors.warning, fontSize: 12, marginTop: 8 }}>Odpowiedź może być niepewna.</Text>}</View>}
        {!!item.sources?.length && <Pressable onPress={() => setSheetSources(item.sources || [])} style={({ pressed }) => [styles.sourcesButton, { backgroundColor: colors.accentSoft, opacity: pressed ? .6 : 1 }]}><Ionicons name="book-outline" size={16} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>{item.sources.length} {item.sources.length === 1 ? 'źródło' : item.sources.length < 5 ? 'źródła' : 'źródeł'}</Text><Ionicons name="chevron-up" size={14} color={colors.accent} /></Pressable>}
      </View>} />
      {send.isError && <View style={[styles.sendError, { backgroundColor: '#FFF1F1', borderColor: colors.danger }]}><Text style={{ color: colors.danger, flex: 1 }}>Nie udało się wysłać wiadomości. Spróbuj ponownie.</Text><Pressable onPress={submit}><Text style={{ color: colors.accent, fontWeight: '800' }}>Ponów</Text></Pressable></View>}
      <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.surface }]}><View style={[styles.composer, { backgroundColor: colors.raised, borderColor: colors.border }]}><TextInput value={input} onChangeText={setInput} placeholder="Napisz wiadomość…" placeholderTextColor={colors.muted} style={[styles.composerInput, { color: colors.ink }]} multiline editable={!send.isPending} onSubmitEditing={submit} blurOnSubmit={false} /><Pressable onPress={submit} disabled={!input.trim() || send.isPending} accessibilityLabel="Wyślij wiadomość" style={[styles.sendButton, { backgroundColor: input.trim() && !send.isPending ? colors.accent : colors.border }]}>{send.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={21} color="#fff" />}</Pressable></View></View>
    </KeyboardAvoidingView>
    {sheetSources && <SourceSheet sources={sheetSources} onClose={() => setSheetSources(null)} onSelect={item => { setSheetSources(null); setPreviewSource(item); }} />}
    {previewSource && <SourcePreview source={previewSource} onClose={() => setPreviewSource(null)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  chatHeader: { minHeight: TOUCH_TARGET_MIN + 14, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  navHit: { minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN, alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 18, paddingVertical: 20 },
  messageWrap: { marginBottom: 18 },
  assistantMessage: { maxWidth: '94%', paddingVertical: 3 },
  userBubble: { maxWidth: '86%', borderRadius: 20, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 11 },
  sourcesButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: TOUCH_TARGET_MIN, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 9 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  composerWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
  composer: { minHeight: TOUCH_TARGET_MIN + 4, maxHeight: 130, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 15, paddingVertical: 4, paddingRight: 4 },
  composerInput: { flex: 1, minHeight: TOUCH_TARGET_MIN - 4, maxHeight: 104, fontSize: 16, paddingTop: 10, paddingBottom: 8, paddingRight: 8 },
  sendButton: { width: TOUCH_TARGET_MIN, height: TOUCH_TARGET_MIN, borderRadius: TOUCH_TARGET_MIN / 2, alignItems: 'center', justifyContent: 'center' },
  sendError: { marginHorizontal: 14, marginBottom: 4, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', gap: 10, alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 35, paddingBottom: 60 },
  welcomeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  welcomeTitle: { fontSize: 23, fontWeight: '800' },
  sheetHandle: { width: 38, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 9, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sourceRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  sourceIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  previewHeader: { minHeight: TOUCH_TARGET_MIN + 11, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

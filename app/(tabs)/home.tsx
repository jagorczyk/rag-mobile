import { useEffect, useRef } from 'react';
import { Animated, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { createChat, getChats, getFolders, getPeople } from '@/api';
import { useTheme } from '@/ThemeContext';
import { AnimatedPressable, EmptyState, Header, Loading, Screen, Surface } from '@/ui';

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(value, { toValue: 1, duration: 360, delay, useNativeDriver: true }).start(); }, [delay, value]);
  return <Animated.View style={{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>{children}</Animated.View>;
}

export default function Home() {
  const { colors } = useTheme();
  const [folders, people, chats] = useQueries({ queries: [
    { queryKey: ['folders'], queryFn: getFolders },
    { queryKey: ['people'], queryFn: getPeople },
    { queryKey: ['chats'], queryFn: getChats },
  ]});
  const recentChats = chats.data?.slice(0, 3) || [];
  const recentFolders = folders.data?.slice(0, 3) || [];

  const newChat = async () => {
    const chat = await createChat();
    router.push({ pathname: '/chat/[id]', params: { id: chat.id } });
  };

  return <Screen>
    <Header title="RAG" subtitle="Twoja przestrzeń wiedzy" action={<Pressable onPress={() => router.push('/settings')} hitSlop={10}><Ionicons name="settings-outline" size={25} color={colors.muted} /></Pressable>} />
    <FlatList
      data={[{ type: 'content' }]}
      keyExtractor={() => 'home'}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      renderItem={() => <>
        <FadeIn>
          <View style={[homeStyles.hero, { backgroundColor: colors.accent }]}>
            <View style={homeStyles.heroOrb} />
            <Text style={homeStyles.eyebrow}>WIEDZA NA WYCIĄGNIĘCIE RĘKI</Text>
            <Text style={homeStyles.heroTitle}>Co chcesz dziś odkryć?</Text>
            <Text style={homeStyles.heroCopy}>Przeszukuj dokumenty i rozmawiaj ze swoją bazą wiedzy.</Text>
            <AnimatedPressable onPress={() => newChat().catch(() => undefined)} style={[homeStyles.heroButton, { backgroundColor: '#fff' }]} accessibilityLabel="Rozpocznij nową rozmowę">
              <Ionicons name="add" size={20} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '900' }}>Nowa rozmowa</Text>
            </AnimatedPressable>
          </View>
        </FadeIn>

        <FadeIn delay={80}><Text style={[homeStyles.sectionTitle, { color: colors.ink }]}>Szybki dostęp</Text><View style={homeStyles.quickRow}>
          <QuickAction icon="folder-open-outline" label="Foldery" color={colors.accent} onPress={() => router.push('/(tabs)/folders')} />
          <QuickAction icon="people-outline" label="Osoby" color={colors.success} onPress={() => router.push('/(tabs)/people')} />
          <QuickAction icon="chatbubble-ellipses-outline" label="Rozmowy" color={colors.warning} onPress={() => router.push('/(tabs)/chats')} />
        </View></FadeIn>

        <FadeIn delay={140}><SectionHeader title="Ostatnie rozmowy" action="Zobacz wszystkie" onPress={() => router.push('/(tabs)/chats')} />{chats.isLoading ? <SkeletonRows /> : recentChats.length === 0 ? <EmptyState icon="💬" title="Brak rozmów" description="Rozpocznij pierwszą rozmowę z dokumentami." /> : recentChats.map(chat => <AnimatedPressable key={chat.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } })} style={{ marginBottom: 10 }}><Surface><View style={homeStyles.row}><View style={[homeStyles.rowIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '800' }}>{chat.title}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Otwórz rozmowę</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></View></Surface></AnimatedPressable>)}</FadeIn>

        <FadeIn delay={200}><SectionHeader title="Twoje foldery" action="Zobacz wszystkie" onPress={() => router.push('/(tabs)/folders')} />{folders.isLoading ? <SkeletonRows /> : recentFolders.length === 0 ? <EmptyState icon="📁" title="Brak folderów" description="Dodaj dokumenty, zdjęcia lub pliki." /> : recentFolders.map(folder => <AnimatedPressable key={folder.id} onPress={() => router.push({ pathname: '/folders/[id]', params: { id: folder.id, name: folder.name } })} style={{ marginBottom: 10 }}><Surface><View style={homeStyles.row}><View style={[homeStyles.rowIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="folder-outline" size={20} color={colors.accent} /></View><Text style={{ color: colors.ink, fontWeight: '800', flex: 1 }}>{folder.name}</Text><Ionicons name="chevron-forward" size={19} color={colors.muted} /></View></Surface></AnimatedPressable>)}</FadeIn>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10 }}>{people.data?.length || 0} rozpoznanych osób w bazie wiedzy</Text>
      </>}
    />
  </Screen>;
}

function QuickAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[homeStyles.quickAction, { backgroundColor: colors.raised, borderColor: colors.border }]} accessibilityLabel={label}><Ionicons name={icon} size={22} color={color} /><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 7 }}>{label}</Text></AnimatedPressable>;
}

function SectionHeader({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <View style={homeStyles.sectionHeader}><Text style={[homeStyles.sectionTitle, { color: colors.ink }]}>{title}</Text><Pressable onPress={onPress}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{action}</Text></Pressable></View>;
}

function SkeletonRows() { return <View><Loading label="Pobieranie danych" /></View>; }

const homeStyles = {
  hero: { borderRadius: 24, padding: 22, overflow: 'hidden' as const, marginBottom: 24 },
  heroOrb: { position: 'absolute' as const, right: -42, top: -42, width: 160, height: 160, borderRadius: 90, backgroundColor: 'rgba(255,255,255,.13)' },
  eyebrow: { color: 'rgba(255,255,255,.72)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 10, maxWidth: 280 },
  heroCopy: { color: 'rgba(255,255,255,.78)', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 290 },
  heroButton: { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11, marginTop: 18 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 8, marginBottom: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '900' as const },
  quickRow: { width: '100%' as const, flexDirection: 'row' as const, gap: 9, marginBottom: 24 },
  quickAction: { flex: 1, minWidth: 0, minHeight: 82, borderRadius: 17, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
} as const;

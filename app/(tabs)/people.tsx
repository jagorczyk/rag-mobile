import { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPeople, renamePerson } from '@/api';
import { useTheme } from '@/ThemeContext';
import { Button, Field, Header, Loading, Screen, styles } from '@/ui';
import type { Person } from '@/types';

export default function People() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const people = useQuery({ queryKey: ['people'], queryFn: getPeople });
  const save = useMutation({ mutationFn: () => renamePerson(editing!.id, name.trim()), onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['people'] }); } });
  return <Screen>
    <Header title="Osoby" />
    <View style={styles.content}>
      {people.isLoading ? <Loading /> : <FlatList style={{ flex: 1 }} keyboardShouldPersistTaps="handled" data={people.data?.filter(person => (person.photos?.length || 0) > 0)} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={{ gap: 10 }} contentContainerStyle={{ paddingBottom: 20 }} ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>Brak rozpoznanych osób ze zdjęciami.</Text>} renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.raised, borderColor: colors.border, flex: 1 }]}>
          {item.photos?.[0] && <Image source={{ uri: `data:${item.photos[0].fileType};base64,${item.photos[0].imageBase64}` }} style={{ height: 135, borderRadius: 8, marginBottom: 10 }} />}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '800' }}>{item.displayName}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.photos?.length || 0} zdjęć</Text></View><Pressable onPress={() => { setEditing(item); setName(item.displayName); }} hitSlop={8}><Ionicons name="pencil-outline" size={19} color={colors.accent} /></Pressable></View>
        </View>
      )} />}
    </View>
    {editing && <Modal visible animationType="slide" transparent onRequestClose={() => setEditing(null)}><KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} /><View style={[styles.card, { margin: 16, marginBottom: 8, backgroundColor: colors.raised, borderColor: colors.accent }]}><Text style={{ color: colors.ink, fontWeight: '800', marginBottom: 8 }}>Zmień nazwę osoby</Text><Field value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={() => { if (name.trim()) save.mutate(); }} /><View style={{ flexDirection: 'row', gap: 8 }}><Button label="Zapisz" onPress={() => save.mutate()} disabled={!name.trim() || save.isPending} /><Button label="Anuluj" secondary onPress={() => setEditing(null)} /></View></View></KeyboardAvoidingView></Modal>}
  </Screen>;
}

import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFolder, deleteFolder, getFolders } from '@/api';
import { useTheme } from '@/ThemeContext';
import { Button, Field, Header, Loading, Screen, styles } from '@/ui';

export default function Folders(){ const {colors}=useTheme(); const qc=useQueryClient(); const [adding,setAdding]=useState(false); const [name,setName]=useState('');
 const folders=useQuery({queryKey:['folders'],queryFn:getFolders});
 const add=useMutation({mutationFn:()=>createFolder(name.trim()),onSuccess:()=>{setName('');setAdding(false);qc.invalidateQueries({queryKey:['folders']});}});
 const remove=(id:string)=>Alert.alert('Usuń folder','Pliki w folderze również zostaną usunięte.',[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:()=>deleteFolder(id).then(()=>qc.invalidateQueries({queryKey:['folders']}))}]);
 return <Screen><Header title="Foldery" action={<View style={{flexDirection:'row',gap:15}}><Pressable onPress={()=>router.push('/settings')} accessibilityLabel="Ustawienia"><Ionicons name="settings-outline" size={25} color={colors.muted}/></Pressable><Pressable onPress={()=>setAdding(v=>!v)} accessibilityLabel="Nowy folder"><Ionicons name="add-circle-outline" size={29} color={colors.accent}/></Pressable></View>}/>
  <View style={styles.content}>{adding&&<View style={[styles.card,{backgroundColor:colors.raised,borderColor:colors.border}]}><Field value={name} onChangeText={setName} placeholder="Nazwa folderu" autoFocus/><View style={{flexDirection:'row',gap:8}}><Button label="Utwórz" onPress={()=>add.mutate()} disabled={!name.trim()||add.isPending}/><Button label="Anuluj" secondary onPress={()=>setAdding(false)}/></View></View>}
  {folders.isLoading?<Loading/>:folders.isError?<Text style={{color:colors.danger}}>Nie udało się pobrać folderów. Sprawdź adres backendu w ustawieniach.</Text>:<FlatList data={folders.data} keyExtractor={x=>x.id} contentContainerStyle={{paddingBottom:20}} ListEmptyComponent={<Text style={{color:colors.muted,textAlign:'center',padding:30}}>Brak folderów</Text>} renderItem={({item})=><Pressable onPress={()=>router.push({pathname:'/folders/[id]',params:{id:item.id,name:item.name}})} style={({pressed})=>[styles.card,{backgroundColor:colors.raised,borderColor:colors.border,flexDirection:'row',alignItems:'center',opacity:pressed?.65:1}]}><View style={{backgroundColor:colors.accentSoft,borderRadius:10,padding:11,marginRight:12}}><Ionicons name="folder" size={23} color={colors.accent}/></View><View style={{flex:1}}><Text style={{color:colors.ink,fontSize:16,fontWeight:'700'}}>{item.name}</Text><Text style={{color:colors.muted,fontSize:12,marginTop:3}}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pl-PL') : 'Folder'}</Text></View><Pressable onPress={()=>remove(item.id)} hitSlop={10} accessibilityLabel={`Usuń ${item.name}`}><Ionicons name="trash-outline" size={20} color={colors.danger}/></Pressable></Pressable>}/>}</View></Screen>;
}

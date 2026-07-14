import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getMessages, sendMessage } from '@/api';
import { useTheme } from '@/ThemeContext';
import { Button, Field, Header, Loading, Screen } from '@/ui';
import type { Message, Source } from '@/types';

export default function ChatDetail(){
  const {colors}=useTheme(); const {id}=useLocalSearchParams<{id:string}>(); const [input,setInput]=useState(''); const list=useRef<FlatList>(null);
  const messages=useQuery({queryKey:['messages',id],queryFn:()=>getMessages(id),enabled:!!id});
  const send=useMutation({mutationFn:()=>sendMessage(id,input.trim()),onSuccess:()=>{setInput('');messages.refetch();}});
  const items:Message[]=[...(messages.data||[]),...(send.isPending?[{id:'pending',role:'assistant' as const,content:'…'}]:[])];
  return <Screen><Header title="Rozmowa" action={<Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={28} color={colors.ink}/></Pressable>}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
    <FlatList ref={list} keyboardShouldPersistTaps="handled" data={items} keyExtractor={x=>x.id} contentContainerStyle={{padding:16,gap:10}} onContentSizeChange={()=>list.current?.scrollToEnd({animated:false})} ListEmptyComponent={messages.isLoading?<Loading/>:<Text style={{color:colors.muted,textAlign:'center',padding:30}}>Napisz pierwszą wiadomość.</Text>} renderItem={({item})=><View style={{alignItems:item.role==='user'?'flex-end':'flex-start'}}><View style={{maxWidth:'88%',padding:13,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:item.role==='user'?colors.raised:colors.sidebar}}><Text style={{color:colors.ink,lineHeight:22}}>{item.content}</Text>{item.uncertain&&<Text style={{color:'#B07010',fontSize:12,marginTop:6}}>Odpowiedź może być niepewna.</Text>}</View>{item.sources&&<Text style={{color:colors.accent,fontSize:12,marginTop:3}}>{item.sources.map((s:Source)=>s.fileName).join(' · ')}</Text>}</View>}/>
    <View style={{padding:12,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.raised,flexDirection:'row',alignItems:'flex-end',gap:8}}><Field value={input} onChangeText={setInput} placeholder="Napisz wiadomość…" multiline style={{flex:1,maxHeight:110,marginBottom:0}}/><Button label="Wyślij" onPress={()=>send.mutate()} disabled={!input.trim()||send.isPending}/></View>
  </KeyboardAvoidingView></Screen>;
}

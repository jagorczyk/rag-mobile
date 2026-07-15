import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ThemeContext';
export default function TabsLayout(){ const {colors}=useTheme(); return <Tabs screenOptions={{headerShown:false, tabBarActiveTintColor:colors.accent, tabBarInactiveTintColor:colors.muted, tabBarStyle:{backgroundColor:colors.raised,borderTopColor:colors.border,height:84,paddingBottom:23,paddingTop:8}, tabBarLabelStyle:{fontSize:11,fontWeight:'600'}}}>
  <Tabs.Screen name="home" options={{title:'Start',tabBarIcon:({color,size})=><Ionicons name="sparkles-outline" color={color} size={size}/>}}/>
  <Tabs.Screen name="folders" options={{title:'Foldery',tabBarIcon:({color,size})=><Ionicons name="folder-outline" color={color} size={size}/>}}/>
  <Tabs.Screen name="people" options={{title:'Osoby',tabBarIcon:({color,size})=><Ionicons name="people-outline" color={color} size={size}/>}}/>
  <Tabs.Screen name="chats" options={{title:'Rozmowy',tabBarIcon:({color,size})=><Ionicons name="chatbubbles-outline" color={color} size={size}/>}}/>
</Tabs>; }

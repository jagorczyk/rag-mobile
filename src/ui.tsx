import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.surface }]}>{children}</SafeAreaView>;
}

export function ModalScreen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom }]}>{children}</View>;
}

export function Header({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
  const { colors } = useTheme();
  return <View style={[styles.header, { borderBottomColor: colors.border }]}>
    <View style={styles.headerTitleRow}>
      {onBack && <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}><Text style={{ color: colors.ink, fontSize: 29, lineHeight: 30 }}>‹</Text></Pressable>}
      <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.ink }]}>{title}</Text>{subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}</View>
    </View>
    {action}
  </View>;
}

export function AnimatedPressable({ children, onPress, style, accessibilityLabel, disabled = false }: { children: React.ReactNode; onPress: () => void; style?: any; accessibilityLabel?: string; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: .965, useNativeDriver: true, speed: 32, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 7 }).start();
  return <Pressable disabled={disabled} style={style} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} accessibilityLabel={accessibilityLabel} accessibilityRole="button">
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? .45 : 1 }}>{children}</Animated.View>
  </Pressable>;
}

export function Button({ label, onPress, secondary = false, disabled = false, icon }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={async () => { await Haptics.selectionAsync(); onPress(); }} disabled={disabled} style={[styles.button, { backgroundColor: secondary ? colors.raised : colors.accent, borderColor: secondary ? colors.border : colors.accent }]}>
    {icon}{<Text style={{ color: secondary ? colors.ink : '#fff', fontWeight: '800' }}>{label}</Text>}
  </AnimatedPressable>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  return <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.field, { backgroundColor: colors.raised, borderColor: colors.border, color: colors.ink }, props.style]} />;
}

export function Surface({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return <View style={[styles.surface, { backgroundColor: colors.raised, borderColor: colors.border }, style]}>{children}</View>;
}

export function Loading({ label = 'Ładowanie' }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>{label}</Text></View>;
}

export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}><Text style={{ fontSize: 27 }}>{icon}</Text></View><Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{description}</Text>{action}</View>;
}

export function Skeleton({ width = '100%', height = 70 }: { width?: number | `${number}%` | 'auto'; height?: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(.45)).current;
  useEffect(() => { const loop = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: .85, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(opacity, { toValue: .45, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])); loop.start(); return () => loop.stop(); }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: 14, backgroundColor: colors.border, opacity, marginBottom: 10 }} />;
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 76 },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  backButton: { width: 32, marginRight: 4, alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -.7 },
  subtitle: { fontSize: 13, marginTop: 2 },
  surface: { borderRadius: 18, borderWidth: 1, padding: 16 },
  button: { minHeight: 46, paddingHorizontal: 17, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  field: { borderWidth: 1, borderRadius: 14, minHeight: 48, paddingHorizontal: 14, fontSize: 16, marginBottom: 10 },
  loading: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 54 },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 20, marginTop: 7, marginBottom: 18 },
  content: { padding: 16, flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 15, marginBottom: 10 },
});

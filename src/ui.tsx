import { forwardRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text as NativeText, TextInput as NativeTextInput, View } from 'react-native';
import type { TextInputProps, TextProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOUCH_TARGET_MIN } from './theme';
import { useTheme } from './ThemeContext';

export { TOUCH_TARGET_MIN };

const interFonts: Record<string, string> = {
  normal: 'Inter_400Regular', '400': 'Inter_400Regular', '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold', '700': 'Inter_700Bold', '800': 'Inter_800ExtraBold',
  bold: 'Inter_700Bold',
};

function fontFor(style: TextProps['style']) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  return interFonts[String(weight || '400')] || interFonts.normal;
}

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={[{ fontFamily: fontFor(style) }, style]} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[{ fontFamily: fontFor(style) }, style]} />;
});

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.surface }]}>{children}</SafeAreaView>;
}

export function ModalScreen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom }]}>{children}</View>;
}

type ModalProps = { children: React.ReactNode; onClose: () => void; contentStyle?: ViewStyle; keyboardAvoiding?: boolean };

export function AnimatedBottomSheet({ children, onClose, contentStyle, keyboardAvoiding = false }: ModalProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const close = () => {
    if (reduced) return onClose();
    Animated.timing(progress, { toValue: 0, duration: 160, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(onClose);
  };
  useEffect(() => { Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 220, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(); }, [progress, reduced]);
  const body = <View style={{ flex: 1, justifyContent: 'flex-end' }}>
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, .16] }) }]} />
    <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Zamknij" accessibilityRole="button" />
    <Animated.View style={[styles.sheet, { backgroundColor: colors.raised, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }], opacity: progress }, contentStyle]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />{children}
    </Animated.View>
  </View>;
  return <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={close}>{keyboardAvoiding ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{body}</KeyboardAvoidingView> : body}</Modal>;
}

export function FadeModal({ children, onClose, contentStyle }: ModalProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const close = () => {
    if (reduced) return onClose();
    Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(onClose);
  };
  useEffect(() => { Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(); }, [progress, reduced]);
  return <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={close}>
    <Animated.View style={[styles.fadeModal, { backgroundColor: colors.surface, opacity: progress }, contentStyle]}>
      <Animated.View style={{ flex: 1, transform: [{ scale: reduced ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [.985, 1] }) }] }}>{children}</Animated.View>
    </Animated.View>
  </Modal>;
}

export function Header({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
  const { colors } = useTheme();
  return <View style={styles.header}><View style={styles.headerTitleRow}>{onBack && <IconButton icon="chevron-back" label="Wróć" onPress={onBack} style={{ marginLeft: -6, marginRight: 4 }} />}<View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>{title}</Text>{subtitle && <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}</View></View>{action}</View>;
}

/** Circular icon control — visual size may be compact; hit area is always ≥ TOUCH_TARGET_MIN. */
export function IconButton({ icon, label, onPress, style }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; style?: any }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.raised, opacity: pressed ? .58 : 1 }, style]}
    >
      <Ionicons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

export function AnimatedPressable({ children, onPress, style, accessibilityLabel, disabled = false }: { children: React.ReactNode; onPress: () => void; style?: any; accessibilityLabel?: string; disabled?: boolean }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => !reduced && Animated.timing(scale, { toValue, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  return <Pressable disabled={disabled} style={style} onPress={onPress} onPressIn={() => animate(.98)} onPressOut={() => animate(1)} accessibilityLabel={accessibilityLabel} accessibilityRole="button"><Animated.View style={{ transform: [{ scale }], opacity: disabled ? .45 : 1 }}>{children}</Animated.View></Pressable>;
}

export function Button({ label, onPress, secondary = false, disabled = false, icon }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={async () => { await Haptics.selectionAsync(); onPress(); }} disabled={disabled} style={[styles.button, { backgroundColor: secondary ? colors.raised : colors.accent, borderColor: secondary ? colors.border : colors.accent }]} accessibilityLabel={label}>{icon}<Text style={{ color: secondary ? colors.ink : '#fff', fontWeight: '800' }}>{label}</Text></AnimatedPressable>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  return <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.field, { backgroundColor: colors.raised, borderColor: colors.border, color: colors.ink }, props.style]} />;
}

export function SearchField({ value, onChangeText, placeholder = 'Szukaj' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.soft }]}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        style={[styles.searchInput, { color: colors.ink }]}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton} accessibilityLabel="Wyczyść wyszukiwanie" accessibilityRole="button">
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.sectionTitle}><Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -.25 }}>{children}</Text>{action}</View>;
}

export function SegmentedControl<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.soft }]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label || option.value}
            style={[styles.segment, active && { backgroundColor: colors.raised, shadowColor: colors.shadow, shadowOpacity: .08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}
          >
            {option.icon && <Ionicons name={option.icon} size={18} color={active ? colors.accent : colors.muted} />}
            {option.label ? <Text style={{ color: active ? colors.ink : colors.muted, fontSize: 13, fontWeight: '700' }}>{option.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Toolbar icon (sort, etc.) with guaranteed ≥44 hit area. */
export function ToolbarIconButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [styles.toolbarIcon, { opacity: pressed ? .55 : 1 }]}>
      <Ionicons name={icon} size={22} color={colors.accent} />
    </Pressable>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return <View style={[styles.surface, { backgroundColor: colors.raised, borderColor: colors.border }, style]}>{children}</View>;
}

export function Loading({ label = 'Ładowanie' }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.muted, marginTop: 10, fontSize: 13 }}>{label}</Text></View>;
}

export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.soft }]}><Text style={{ fontSize: 27 }}>{icon}</Text></View>
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.muted }]}>{description}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Skeleton({ width = '100%', height = 70 }: { width?: number | `${number}%` | 'auto'; height?: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(.45)).current;
  useEffect(() => {
    if (reduced) {
      opacity.setValue(.55);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: .85, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: .45, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);
  return <Animated.View style={{ width, height, borderRadius: 14, backgroundColor: colors.border, opacity, marginBottom: 10 }} />;
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  fadeModal: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 13, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 65 },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  iconButton: {
    height: TOUCH_TARGET_MIN,
    width: TOUCH_TARGET_MIN,
    borderRadius: TOUCH_TARGET_MIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: .07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 7,
    elevation: 2,
  },
  toolbarIcon: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -.8 },
  subtitle: { fontSize: 13, marginTop: 2 },
  surface: { borderRadius: 16, borderWidth: 1, padding: 15 },
  button: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 17,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  field: { borderWidth: 1, borderRadius: 13, minHeight: TOUCH_TARGET_MIN, paddingHorizontal: 14, fontSize: 16, marginBottom: 10 },
  search: { minHeight: TOUCH_TARGET_MIN, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 16, minHeight: TOUCH_TARGET_MIN },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 12, gap: 2 },
  segment: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  loading: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 54 },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 20, marginTop: 7, marginBottom: 8 },
  emptyAction: { marginTop: 10, minWidth: 200, alignSelf: 'stretch', maxWidth: 280 },
  content: { paddingHorizontal: 16, flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 15, marginBottom: 10 },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 34, shadowColor: '#000', shadowOpacity: .16, shadowOffset: { width: 0, height: -4 }, shadowRadius: 18, elevation: 10 },
  sheetHandle: { width: 38, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 9, marginBottom: 18 },
});

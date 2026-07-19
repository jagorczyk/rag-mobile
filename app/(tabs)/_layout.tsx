import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { TOUCH_TARGET_MIN, Text, useReducedMotion } from '@/ui';

const icons = {
  folders: { active: 'folder', inactive: 'folder-outline' },
  people: { active: 'people', inactive: 'people-outline' },
  chats: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
} as const;

function TabItem({
  focused,
  label,
  icon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: reducedMotion ? 0 : focused ? 220 : 150,
      easing: focused ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [focused, progress, reducedMotion]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activePill,
          {
            backgroundColor: colors.soft,
            opacity: progress,
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.82, 1] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: reducedMotion
              ? []
              : [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [1, -1] }) },
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.96, 1] }) },
                ],
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={focused ? colors.accent : colors.muted} />
        <Text style={[styles.label, { color: focused ? colors.ink : colors.muted }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function CompactTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - 40, 300);
  const visibleRoutes = state.routes.filter(route => route.name !== 'home');

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBar,
        {
          left: (width - barWidth) / 2,
          bottom: Math.max(insets.bottom + 8, 12),
          width: barWidth,
          backgroundColor: colors.raised,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {visibleRoutes.map(route => {
          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;
          const options = descriptors[route.key].options;
          const iconNames = icons[route.name as keyof typeof icons];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const icon = iconNames?.[focused ? 'active' : 'inactive'] ?? 'ellipse-outline';
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              icon={icon}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="folders"
      tabBar={props => <CompactTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="folders" options={{ title: 'Biblioteka' }} />
      <Tabs.Screen name="people" options={{ title: 'Osoby' }} />
      <Tabs.Screen name="chats" options={{ title: 'Rozmowy' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: TOUCH_TARGET_MIN + 12,
    padding: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    shadowOpacity: .1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    minWidth: TOUCH_TARGET_MIN,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: .62 },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home',    label: 'Home',     icon: 'home-outline',     iconActive: 'home' },
  { id: 'search',  label: 'Search',   icon: 'search-outline',   iconActive: 'search' },
  { id: 'library', label: 'Library',  icon: 'library-outline',  iconActive: 'library' },
  { id: 'ai',      label: 'AI Music', icon: 'sparkles-outline', iconActive: 'sparkles' },
];

export function TopNav({ activeTab, onTabChange }) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Single row: ViBE | tabs */}
      <View style={styles.navRow}>

        {/* ViBE logo — all heavy weight, Vi slightly dimmed */}
        <View style={styles.logoWrap}>
          <Text style={[styles.logoText, {
            textShadowColor: theme.accent,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          }]}>
            <Text style={{ color: theme.accentBright + 'AA' }}>Vi</Text>
            <Text style={{ color: theme.accentBright }}>BE</Text>
          </Text>
        </View>

        {/* Tabs — active is just purple, no box */}
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={18}
                color={active ? theme.accentBright : theme.accent + '66'}
              />
              <Text style={[styles.tabLabel, { color: active ? theme.accentBright : theme.accent + '66' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  logoWrap: {
    paddingHorizontal: 6,
    marginRight: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home',    label: 'Home' },
  { id: 'search',  label: 'Search' },
  { id: 'library', label: 'Library' },
  { id: 'ai',      label: 'AI Music' },
];

export function TopNav({ activeTab, onTabChange }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.wrapper,
      {
        paddingTop:      insets.top + 6,
        backgroundColor: theme.navBg,
        borderBottomColor: theme.border,
      },
    ]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: theme.accentBright }]}>ViBE</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabLabel,
                { color: active ? theme.accentBright : theme.textDim },
              ]}>
                {tab.label}
              </Text>
              {active && (
                <View style={[styles.indicator, { backgroundColor: theme.accentBright }]} />
              )}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    borderRadius: 1,
  },
});

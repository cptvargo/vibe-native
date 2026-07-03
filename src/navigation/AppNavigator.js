import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { TopNav } from '../components/TopNav';
import { HomeScreen } from '../screens/HomeScreen';
import { AIScreen } from '../screens/AIScreen';

const Stack = createStackNavigator();

// Placeholder screens
const SearchScreen  = () => {
  const { theme } = useTheme();
  return <View style={[styles.placeholder, { backgroundColor: theme.background }]}><Text style={{ color: theme.textDim }}>Search coming soon</Text></View>;
};
const LibraryScreen = () => {
  const { theme } = useTheme();
  return <View style={[styles.placeholder, { backgroundColor: theme.background }]}><Text style={{ color: theme.textDim }}>Library coming soon</Text></View>;
};

function MainScreen({ navigation }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={[styles.main, { backgroundColor: theme.background }]}>
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.content}>
        {activeTab === 'home'    && <HomeScreen    navigation={navigation} />}
        {activeTab === 'search'  && <SearchScreen  navigation={navigation} />}
        {activeTab === 'library' && <LibraryScreen navigation={navigation} />}
        {activeTab === 'ai'      && <AIScreen      navigation={navigation} />}
      </View>
    </View>
  );
}

export function AppNavigator() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="Main"   component={MainScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  main:        { flex: 1 },
  content:     { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

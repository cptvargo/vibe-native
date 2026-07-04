import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { TopNav } from '../components/TopNav';
import { MiniPlayer } from '../components/MiniPlayer';
import { HomeScreen } from '../screens/HomeScreen';
import { AIScreen } from '../screens/AIScreen';
import { ArtistScreen } from '../screens/ArtistScreen';
import { AlbumScreen }  from '../screens/AlbumScreen';
import { PlayerScreen } from '../screens/PlayerScreen';

const Stack = createStackNavigator();
const SCREEN_H = Dimensions.get('window').height;

// Slide up from bottom with zero overlay — no dimming, no white flash
const slideUpInterpolator = ({ current: { progress } }) => ({
  cardStyle: {
    transform: [{
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_H, 0],
      }),
    }],
  },
});

const SearchScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textDim }}>Search coming soon</Text>
    </View>
  );
};
const LibraryScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textDim }}>Library coming soon</Text>
    </View>
  );
};

function MainScreen({ navigation }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={[styles.main, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.navBg }}>
        <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SafeAreaView>

      <View style={styles.content}>
        {activeTab === 'home'    && <HomeScreen    navigation={navigation} />}
        {activeTab === 'search'  && <SearchScreen  navigation={navigation} />}
        {activeTab === 'library' && <LibraryScreen navigation={navigation} />}
        {activeTab === 'ai'      && <AIScreen      navigation={navigation} />}
      </View>

      <MiniPlayer onOpen={() => navigation.navigate('Player')} />
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
      <Stack.Screen name="Artist" component={ArtistScreen} />
      <Stack.Screen name="Album"  component={AlbumScreen} />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          // transparentModal keeps MainScreen fully rendered beneath the player
          // so it shows through correctly when swiping down
          presentation: 'transparentModal',
          headerShown: false,
          gestureEnabled: false,
          cardOverlayEnabled: false,
          cardStyle: { backgroundColor: 'transparent' },
          cardStyleInterpolator: slideUpInterpolator,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  main:        { flex: 1 },
  content:     { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

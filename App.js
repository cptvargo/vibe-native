import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { StatusBar } from 'expo-status-bar';

import { AppNavigator } from './src/navigation/AppNavigator';
import { setupPlayer } from './src/audio/trackPlayerService';
import { initServerUrl } from './src/api/jellyfin';

export default function App() {
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    initServerUrl();
    setupPlayer()
      .then(() => setPlayerReady(true))
      .catch(console.error);
  }, []);

  if (!playerReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={{ colors: { background: '#080810' } }}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

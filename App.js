import { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
        <NavigationContainer theme={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              background: '#080810',
              card: '#0f0f1a',
              primary: '#a78bfa',
              border: 'rgba(255,255,255,0.08)',
            },
          }}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

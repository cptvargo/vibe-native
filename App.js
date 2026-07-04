import { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import { Image as ExpoImage } from 'expo-image';

import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { setupPlayer, PlaybackService } from './src/audio/trackPlayerService';
import { initServerUrl } from './src/api/jellyfin';
import { useUltraBlurPalette, prewarmPalette } from './src/hooks/useUltraBlurPalette';

TrackPlayer.registerPlaybackService(() => PlaybackService);

/**
 * PlayerColorSync — always mounted, reacts to track changes.
 *
 * Uses useUltraBlurPalette to extract the full Vibrant palette (proxy server →
 * BlurHash fallback) and pipes it into ThemeContext. Deliberately does NOT reset
 * the theme when the new track is loading, so the previous album's colors stay
 * visible during the extraction window — same behaviour as Plexamp.
 */
function PlayerColorSync() {
  const { setPalette, resetTheme } = useTheme();
  const activeTrack = useActiveTrack();
  const palette = useUltraBlurPalette(activeTrack || null);

  // Apply palette for the current track
  useEffect(() => {
    if (!activeTrack) { resetTheme(); return; }
    if (Object.values(palette).some(v => v !== null)) setPalette(palette);
  }, [palette, activeTrack?.id]);

  // Pre-warm the next track 1.5 s into playback so skipping feels instant
  useEffect(() => {
    if (!activeTrack) return;
    const timer = setTimeout(async () => {
      try {
        const [index, queue] = await Promise.all([
          TrackPlayer.getActiveTrackIndex(),
          TrackPlayer.getQueue(),
        ]);
        const next = queue[index + 1];
        if (next) {
          if (next.artwork) ExpoImage.prefetch(next.artwork).catch(() => {});
          prewarmPalette(next);
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeTrack?.id]);

  return null;
}

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
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <NavigationContainer
            theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                background: '#000000',
                card: '#000000',
                primary: '#7C3AED',
                border: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <StatusBar hidden />
            <AppNavigator />
            <PlayerColorSync />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

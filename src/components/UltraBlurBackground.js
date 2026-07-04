/**
 * UltraBlurBackground
 *
 * Plexamp-style ambient background for the full-screen player.
 * Layers (bottom to top):
 *   1. Album art — expo-image (disk-cached; no download on repeat plays)
 *   2. BlurView — heavy Gaussian blur
 *   3. Palette-tinted gradient — album mood color
 *   4. Bottom-edge dark fade — keeps controls readable
 *
 * The ENTIRE component (image + gradients together) fades as one unit when
 * artwork changes. This prevents the gradient colors from snapping to the
 * new palette while the background image is still showing the old artwork.
 */

import { useRef, useEffect, useState } from 'react';
import { StyleSheet, Animated, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export function UltraBlurBackground({ artwork, theme }) {
  // displayArtwork / displayTheme travel together — they update atomically
  // only after the fade-out completes, so the image and gradients never mismatch.
  const [display, setDisplay] = useState({ artwork: null, theme });
  const opacity = useRef(new Animated.Value(0)).current;
  const pendingRef = useRef(null);
  const prevArtworkRef = useRef(null);

  useEffect(() => {
    if (!artwork) {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setDisplay({ artwork: null, theme });
        prevArtworkRef.current = null;
      });
      return;
    }

    // Theme-only change (same artwork) — update display immediately without fading
    if (artwork === prevArtworkRef.current) {
      setDisplay(d => ({ ...d, theme }));
      return;
    }

    prevArtworkRef.current = artwork;

    // First load: skip the dip
    if (!display.artwork) {
      setDisplay({ artwork, theme });
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      return;
    }

    // Track change: dip → swap image+theme atomically → rise
    Animated.timing(opacity, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setDisplay({ artwork, theme });
      Animated.timing(opacity, { toValue: 1, duration: 340, useNativeDriver: true }).start();
    });
  }, [artwork, theme]);

  const { ultraBlur } = display.theme;

  return (
    <Animated.View style={[styles.root, { opacity }]} pointerEvents="none">
      {/* ── 1. Full-bleed album art — expo-image provides aggressive disk cache ── */}
      <Image
        source={display.artwork ? { uri: display.artwork } : null}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        blurRadius={Platform.OS === 'android' ? 22 : 0}
      />

      {/* ── 2. Blur layer ─────────────────────────────────────────────────── */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBlurFallback]} />
      )}

      {/* ── 3. Palette-tinted gradient ──────────────────────────────────── */}
      <LinearGradient
        colors={[ultraBlur.tint1, ultraBlur.tint2, ultraBlur.tint1]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 4. Bottom dark fade ─────────────────────────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  androidBlurFallback: {
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
});

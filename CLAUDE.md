@AGENTS.md

# Vibe Native — Project Context

This is a React Native rewrite of the Vibe music app (Jellyfin client). The old Capacitor PWA is at `e:\vibe-app` — keep it for reference but don't touch it.

## Why the rewrite
Capacitor fought iOS constantly: audio needed a custom Swift plugin, WKWebView gestures conflicted with JS pointer events, safe areas were wrong, lock screen controls required custom Swift. React Native (via Expo) eliminates all of that.

## Stack
- **Expo managed workflow** + **EAS Build** (cloud iOS builds, no Mac needed)
- **react-native-track-player** — replaces VibePlayer.js + NativeAudioPlugin.swift + AVAudioSession
- **React Navigation** — bottom tabs + stack
- **react-native-gesture-handler** + **react-native-reanimated** — gestures
- **react-native-safe-area-context** — safe areas

## What's already built
- `src/api/jellyfin.js` — migrated from old app, no changes needed
- `src/config/vibeConfig.js` — EXPO_PUBLIC_* env vars
- `src/utils/format.js` — migrated
- `src/audio/trackPlayerService.js` — core audio: setupPlayer(), PlaybackService(), toTrackPlayerTrack(). Handles background audio, lock screen controls, Jellyfin scrobbling. Replaces ~500 lines of Swift + JS.
- `src/navigation/AppNavigator.js` — bottom tab navigator with placeholder screens
- `App.js` — root component
- `index.js` — registers TrackPlayer background service

## Env vars
Old VITE_* → new EXPO_PUBLIC_*:
- `VITE_JELLYFIN_URL` → `EXPO_PUBLIC_JELLYFIN_URL`
- `VITE_JELLYFIN_LOCAL_URL` → `EXPO_PUBLIC_JELLYFIN_LOCAL_URL`
- `VITE_JELLYFIN_API_KEY` → `EXPO_PUBLIC_JELLYFIN_API_KEY`
- `VITE_JELLYFIN_USER_ID` → `EXPO_PUBLIC_JELLYFIN_USER_ID`

Copy values from `e:\vibe-app\.env` into a `.env` here with the new prefix.

## What's next
1. **Push to GitHub** — user created the repo but hasn't pushed yet
2. **EAS secrets** — `npx eas-cli secret:create` for each EXPO_PUBLIC_ var
3. **Build screens** — HomeScreen, SearchScreen, LibraryScreen, Player, MiniPlayer
   - Mechanical conversion: `div` → `View`, `span` → `Text`, inline CSS → `StyleSheet.create()`
   - Reference `e:\vibe-app\src\features\` for the original logic
4. **Storage** — hotTracks.js and fireSongs.js use `localStorage` → swap to `AsyncStorage`
5. **Waveform** — replace canvas with `react-native-skia` or simplify to a seek bar for now
6. **First iOS build** — `npx eas-cli build --platform ios --profile production`
7. **TestFlight submit** — `npx eas-cli submit --platform ios --latest`

## User context
- User is Jesus Vargas, building this for personal use as a Jellyfin music client
- He doesn't have a Mac — EAS Build cloud pipeline is essential
- ABIDE is a separate Capacitor app — it stays Capacitor, don't confuse the two

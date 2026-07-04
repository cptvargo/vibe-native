import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, {
  useActiveTrack, usePlaybackState, useProgress, State,
} from 'react-native-track-player';
import { useTheme } from '../context/ThemeContext';

export function MiniPlayer({ onOpen }) {
  const { theme } = useTheme();
  const activeTrack = useActiveTrack();
  const { state } = usePlaybackState();
  const { position, duration } = useProgress();
  const insets = useSafeAreaInsets();

  if (!activeTrack) return null;

  const isPlaying = state === State.Playing;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.wrapper}>
      {/* Thin accent progress line at the very top of the bar */}
      <View style={styles.progressTrack}>
        <View style={{ flex: progress, backgroundColor: theme.accent, height: 2 }} />
        <View style={{ flex: Math.max(0, 1 - progress), height: 2 }} />
      </View>

      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.97}
        style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Top border line */}
        <View style={[styles.topBorder, { backgroundColor: theme.accent + '40' }]} />

        <View style={styles.row}>
          {/* Album art */}
          {activeTrack.artwork ? (
            <Image source={{ uri: activeTrack.artwork }} style={styles.art} />
          ) : (
            <View style={[styles.art, { backgroundColor: theme.surface }]} />
          )}

          {/* Title + artist */}
          <View style={styles.meta}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {activeTrack.title}
            </Text>
            <Text style={[styles.artist, { color: theme.textDim }]} numberOfLines={1}>
              {activeTrack.artist}
            </Text>
          </View>

          {/* Play / pause */}
          <TouchableOpacity
            onPress={() => isPlaying ? TrackPlayer.pause() : TrackPlayer.play()}
            style={styles.btn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color={theme.accentBright}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={() => TrackPlayer.skipToNext().catch(() => {})}
            style={styles.btn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="play-skip-forward" size={22} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // No border radius — extends flush to screen edges at bottom
  },
  progressTrack: {
    flexDirection: 'row',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bar: {
    overflow: 'hidden',
    paddingTop: 2,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  meta: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

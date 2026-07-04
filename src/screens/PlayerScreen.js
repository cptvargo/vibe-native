import { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import TrackPlayer, {
  useActiveTrack, usePlaybackState, useProgress,
  State as TrackState, RepeatMode,
} from 'react-native-track-player';
import { useTheme } from '../context/ThemeContext';
import { UltraBlurBackground } from '../components/UltraBlurBackground';
import { fmtTime } from '../utils/format';

const { width: W } = Dimensions.get('window');
const ART_SIZE  = Math.min(W * 0.78, 320);
const BAR_COUNT = 44;

// Static waveform shape — Gaussian envelope + deterministic texture.
// Heights are fixed; progress fills left-to-right rather than bars bouncing.
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const norm     = (i - BAR_COUNT / 2) / (BAR_COUNT / 4);
  const gaussian = Math.exp(-norm * norm * 0.55);
  const texture  = Math.sin(i * 2.1) * 0.13 + Math.sin(i * 5.4 + 1.1) * 0.09;
  return Math.max(0.07, Math.min(1.0, 0.10 + gaussian * 0.82 + texture * gaussian));
});

// ─── WaveformScrubber ─────────────────────────────────────────────────────────

function WaveformScrubber({ theme }) {
  const { position, duration } = useProgress(500);
  const [barWidth, setBarWidth] = useState(0);

  const progress     = duration > 0 ? position / duration : 0;
  const playedCount  = Math.round(progress * BAR_COUNT);
  const playheadAnim = useRef(new Animated.Value(0)).current;

  // Glide the playhead smoothly between progress ticks
  useEffect(() => {
    if (!barWidth) return;
    Animated.timing(playheadAnim, {
      toValue: progress * barWidth,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [progress, barWidth]);

  const handleSeek = (e) => {
    if (!barWidth || !duration) return;
    const ratio = Math.max(0, Math.min(e.nativeEvent.locationX / barWidth, 1));
    TrackPlayer.seekTo(ratio * duration);
  };

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleSeek}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={styles.scrubberTouch}
      >
        {/* Static waveform bars — fill left-to-right based on progress */}
        <View style={styles.barsRow}>
          {BAR_HEIGHTS.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.round(h * 52),
                  backgroundColor: i < playedCount
                    ? theme.accentBright
                    : theme.accentBright + '30',
                },
              ]}
            />
          ))}
        </View>

        {/* Smooth-gliding playhead line */}
        {barWidth > 0 && (
          <Animated.View
            style={[
              styles.playhead,
              { transform: [{ translateX: playheadAnim }] },
            ]}
          />
        )}
      </TouchableOpacity>

      <View style={styles.timesRow}>
        <Text style={[styles.timeText, { color: theme.textFaint }]}>{fmtTime(position)}</Text>
        <Text style={[styles.timeText, { color: theme.textFaint }]}>{fmtTime(duration)}</Text>
      </View>
    </View>
  );
}

// ─── PlayerScreen ─────────────────────────────────────────────────────────────

export function PlayerScreen({ navigation }) {
  const { theme }   = useTheme();
  const insets      = useSafeAreaInsets();
  const activeTrack = useActiveTrack();
  const { state }   = usePlaybackState();

  const isPlaying = state === TrackState.Playing;
  const [repeatOn, setRepeatOn] = useState(false);

  // ── Swipe-down dismiss ───────────────────────────────────────────────────────
  const dragY = useRef(new Animated.Value(0)).current;

  const translateY = dragY.interpolate({
    inputRange: [-1, 0, 600],
    outputRange: [0,  0, 600],
    extrapolate: 'clamp',
  });

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationY > 100) {
        navigation.goBack();
      } else {
        Animated.spring(dragY, {
          toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
        }).start();
      }
    }
  };

  const toggleRepeat = async () => {
    const next = !repeatOn;
    await TrackPlayer.setRepeatMode(next ? RepeatMode.Queue : RepeatMode.Off);
    setRepeatOn(next);
  };

  // Dynamic icon/button colors based on WCAG-computed text contrast
  const iconColor      = theme.ultraBlur.textColor;
  const iconColorFaint = theme.ultraBlur.textIsLight ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)';

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetY={[-1000, 15]}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY }] },
        ]}
      >
        {/* ── UltraBlur ambient background — sits behind everything ─────────── */}
        <UltraBlurBackground artwork={activeTrack?.artwork} theme={theme} />

        {/* ── Accent glow — vibrant color wash from the top edge ───────────── */}
        <LinearGradient
          colors={[theme.accent + '70', theme.accent + '28', 'transparent']}
          locations={[0, 0.4, 1]}
          style={styles.topGlow}
          pointerEvents="none"
        />

        {/* ── Drag handle ───────────────────────────────────────────────────── */}
        <View style={[styles.handleWrap, { paddingTop: insets.top + 10 }]}>
          <View style={styles.handle} />
        </View>

        {/* ── Album art ─────────────────────────────────────────────────────── */}
        <View style={styles.artWrap}>
          <ExpoImage
            source={activeTrack?.artwork ? { uri: activeTrack.artwork } : null}
            style={[styles.art, { shadowColor: theme.accent, backgroundColor: theme.surface }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
        </View>

        {/* ── Track info ────────────────────────────────────────────────────── */}
        <View style={styles.infoWrap}>
          <Text style={[styles.trackTitle, { color: iconColor }]} numberOfLines={1}>
            {activeTrack?.title || '—'}
          </Text>
          <Text style={[styles.trackArtist, { color: theme.accentBright }]} numberOfLines={1}>
            {activeTrack?.artist || ''}
          </Text>
        </View>

        {/* ── Waveform scrubber ─────────────────────────────────────────────── */}
        <View style={styles.scrubberSection}>
          <WaveformScrubber theme={theme} />
        </View>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.sideBtn} activeOpacity={0.7}>
            <Ionicons name="shuffle" size={22} color={iconColorFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => TrackPlayer.skipToPrevious().catch(() => {})}
            style={styles.sideBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-back" size={30} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => isPlaying ? TrackPlayer.pause() : TrackPlayer.play()}
            style={[styles.playBtn, { backgroundColor: theme.accentBright, shadowColor: theme.accent }]}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#000"
              style={{ marginLeft: isPlaying ? 0 : 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => TrackPlayer.skipToNext().catch(() => {})}
            style={styles.sideBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-forward" size={30} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} style={styles.sideBtn} activeOpacity={0.7}>
            <Ionicons
              name="repeat"
              size={22}
              color={repeatOn ? theme.accentBright : iconColorFaint}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 16 }} />
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  topGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 300,
  },

  handleWrap: { alignItems: 'center', paddingBottom: 10 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  artWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  art: {
    width: ART_SIZE, height: ART_SIZE, borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 40,
  },

  infoWrap: { paddingHorizontal: 32, marginBottom: 20 },
  trackTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 5 },
  trackArtist: { fontSize: 15, fontWeight: '500' },

  scrubberSection: { paddingHorizontal: 28, marginBottom: 28 },
  scrubberTouch:   { height: 60, justifyContent: 'center' },
  barsRow: {
    flexDirection: 'row', height: 60, alignItems: 'center', gap: 2,
  },
  bar: { flex: 1, height: 52, borderRadius: 2 },
  playhead: {
    position: 'absolute', top: 4, bottom: 4, width: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, fontWeight: '500' },

  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sideBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 24,
  },
});

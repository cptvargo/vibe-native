import { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveTrack } from 'react-native-track-player';
import { useTheme } from '../context/ThemeContext';
import { useUltraBlurPalette } from '../hooks/useUltraBlurPalette';
import { getAlbumTracks, getImageUrl } from '../api/jellyfin';
import { playQueue, toTrackPlayerTrack } from '../audio/trackPlayerService';
import { fmtTime } from '../utils/format';
import { EMPTY_PALETTE } from '../context/ThemeContext';

const { width: W } = Dimensions.get('window');
const ART_SIZE = Math.min(W * 0.58, 240);
const HERO_H   = ART_SIZE + 180;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return [0, 0, 0];
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

function TrackRow({ track, index, accent, isPlaying, onPress }) {
  const dimColor  = 'rgba(255,255,255,0.45)';
  const baseColor = '#ffffff';

  return (
    <TouchableOpacity
      style={[styles.trackRow, isPlaying && { backgroundColor: withAlpha(accent, 0.10) }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Track number / playing indicator */}
      <View style={styles.trackNum}>
        {isPlaying ? (
          <Ionicons name="musical-notes" size={14} color={accent} />
        ) : (
          <Text style={[styles.trackNumText, { color: dimColor }]}>
            {track.IndexNumber || index + 1}
          </Text>
        )}
      </View>

      {/* Title + artist */}
      <View style={styles.trackMeta}>
        <Text
          style={[styles.trackTitle, { color: isPlaying ? accent : baseColor }]}
          numberOfLines={1}
        >
          {track.Name}
        </Text>
        {track.Artists?.[0] && track.Artists[0] !== track.AlbumArtist && (
          <Text style={[styles.trackArtist, { color: dimColor }]} numberOfLines={1}>
            {track.Artists[0]}
          </Text>
        )}
      </View>

      {/* Duration */}
      <Text style={[styles.trackDur, { color: dimColor }]}>
        {track.RunTimeTicks ? fmtTime(track.RunTimeTicks / 10_000_000) : '—'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── AlbumScreen ──────────────────────────────────────────────────────────────

export function AlbumScreen({ route, navigation }) {
  const { albumId, albumName, albumArtUrl, year, artistName } = route.params;
  const insets    = useSafeAreaInsets();
  const { theme } = useTheme();
  const activeTrack = useActiveTrack();

  const [tracks, setTracks] = useState([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Local palette from this album's art — doesn't touch global ThemeContext ──
  const localTrack = albumId ? {
    id:        albumId,
    artwork:   albumArtUrl,
    _blurHash: null,
  } : null;
  const palette  = useUltraBlurPalette(localTrack);
  const accent   = palette.vibrant ?? palette.lightVibrant ?? theme.accent;
  const darkTint = palette.darkVibrant ?? palette.darkMuted ?? '#000000';

  useEffect(() => {
    getAlbumTracks(albumId)
      .then(r => setTracks(r.Items || []))
      .catch(console.error);
  }, [albumId]);

  const isSingle   = tracks.length === 1;
  const totalTicks = tracks.reduce((s, t) => s + (t.RunTimeTicks || 0), 0);
  const totalMins  = Math.round(totalTicks / 10_000_000 / 60);

  const handlePlay = async (startIndex = 0) => {
    if (!tracks.length) return;
    await playQueue(tracks, startIndex);
    navigation.navigate('Player');
  };

  const handleShuffle = async () => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    await playQueue(shuffled, 0);
    navigation.navigate('Player');
  };

  // Parallax: album art moves up at half scroll speed
  const artTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_H],
    outputRange: [0, -HERO_H * 0.35],
    extrapolate: 'clamp',
  });

  // Header background fades in as you scroll past the hero
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      {/* ── Ambient blurred background ─────────────────────────────────────── */}
      {albumArtUrl && (
        <Image
          source={{ uri: albumArtUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={28}
        />
      )}
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[withAlpha(darkTint, 0.55), 'rgba(0,0,0,0.85)', '#000000']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Sticky animated header ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 8 },
          { backgroundColor: headerBg.interpolate
              ? headerBg.interpolate({ inputRange: [0,1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)'] })
              : 'transparent'
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {albumName}
        </Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={[styles.hero, { height: HERO_H, paddingTop: insets.top + 52 }]}>
          {/* Accent glow behind the art */}
          <View style={[styles.artGlow, { shadowColor: accent }]}>
            <Animated.View style={{ transform: [{ translateY: artTranslateY }] }}>
              <Image
                source={{ uri: albumArtUrl }}
                style={[styles.art, { shadowColor: accent }]}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Album meta */}
          <View style={styles.heroMeta}>
            <Text style={styles.albumName} numberOfLines={2}>{albumName}</Text>
            <Text style={[styles.albumSub, { color: withAlpha(accent, 0.9) }]}>
              {[artistName, year, isSingle ? 'Single' : `${tracks.length} tracks${totalMins > 0 ? ` · ${totalMins} min` : ''}`]
                .filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        </View>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={() => handlePlay(0)}
          >
            <Ionicons name="play" size={18} color="#000" />
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shuffleBtn, { borderColor: withAlpha(accent, 0.6) }]}
            activeOpacity={0.85}
            onPress={handleShuffle}
          >
            <Ionicons name="shuffle" size={18} color={accent} />
            <Text style={[styles.shuffleBtnText, { color: accent }]}>Shuffle</Text>
          </TouchableOpacity>
        </View>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <View style={[styles.divider, { backgroundColor: withAlpha(accent, 0.15) }]} />

        {/* ── Track list ───────────────────────────────────────────────── */}
        {tracks.map((track, i) => (
          <TrackRow
            key={track.Id}
            track={track}
            index={i}
            accent={accent}
            isPlaying={activeTrack?.id === track.Id}
            onPress={() => handlePlay(i)}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700',
    color: '#fff', paddingHorizontal: 8,
  },

  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    gap: 16,
  },
  artGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 48,
  },
  art: {
    width: ART_SIZE, height: ART_SIZE,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
  },
  heroMeta: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  albumName: {
    fontSize: 24, fontWeight: '800',
    color: '#fff', textAlign: 'center',
    letterSpacing: 0.2,
  },
  albumSub: {
    fontSize: 12, fontWeight: '500',
    textAlign: 'center', letterSpacing: 0.6,
  },

  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  playBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 12, gap: 8,
  },
  playBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  shuffleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 12, borderWidth: 1.5, gap: 8,
  },
  shuffleBtnText: { fontSize: 15, fontWeight: '700' },

  divider: { height: 1, marginHorizontal: 20, marginBottom: 8 },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  trackNum: { width: 24, alignItems: 'center' },
  trackNumText: { fontSize: 13, fontWeight: '500' },
  trackMeta: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
  trackArtist: { fontSize: 12, marginTop: 2 },
  trackDur: { fontSize: 12, fontWeight: '500' },
});

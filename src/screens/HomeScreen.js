import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, FlatList,
  StyleSheet, Animated, Dimensions,
  TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
  getRecentlyPlayed, getRecentAlbums, getTopAlbums,
  getGenres, getArtists, getImageUrl, getAlbumImageUrl,
  getArtistImageUrl,
} from '../api/jellyfin';

const { width: W, height: H } = Dimensions.get('window');
const ALBUM_CARD  = 140;
const ARTIST_SIZE = 80;
const GENRE_W     = 160;
const GENRE_H     = 100;

// ─── Reusable section header ───────────────────────────────────────────────
function SectionHeader({ title, onViewAll, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={[styles.viewAll, { color: theme.accentBright }]}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Album card (square art + title + artist) ──────────────────────────────
function AlbumCard({ item, onPress, theme }) {
  const artUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', 300)
    : null;
  return (
    <TouchableOpacity onPress={() => onPress?.(item)} style={styles.albumCard} activeOpacity={0.8}>
      {artUrl ? (
        <Image source={{ uri: artUrl }} style={[styles.albumArt, { borderColor: theme.border }]} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtEmpty, { backgroundColor: theme.surface, borderColor: theme.border }]} />
      )}
      <Text style={[styles.albumName, { color: theme.text }]} numberOfLines={1}>{item.Name}</Text>
      <Text style={[styles.albumArtist, { color: theme.textDim }]} numberOfLines={1}>
        {item.AlbumArtist || item.Artists?.[0] || ''}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Artist card (circle photo + name) ────────────────────────────────────
function ArtistCard({ artistId, artistName, onPress, theme }) {
  const imgUrl = artistId ? getArtistImageUrl(artistId, 200) : null;
  return (
    <TouchableOpacity
      onPress={() => onPress?.({ Id: artistId, Name: artistName })}
      style={styles.artistCard}
      activeOpacity={0.8}
    >
      <View style={[styles.artistRing, { borderColor: theme.accent }]}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.artistImg} />
        ) : (
          <View style={[styles.artistImg, { backgroundColor: theme.surface }]} />
        )}
      </View>
      <Text style={[styles.artistName, { color: theme.textDim }]} numberOfLines={1}>
        {artistName}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recently played track row ─────────────────────────────────────────────
function TrackRow({ track, onPress, theme }) {
  const artUrl = getAlbumImageUrl(track, 100);
  return (
    <TouchableOpacity onPress={() => onPress?.(track)} style={styles.trackRow} activeOpacity={0.7}>
      {artUrl ? (
        <Image source={{ uri: artUrl }} style={[styles.trackArt, { borderColor: theme.border }]} />
      ) : (
        <View style={[styles.trackArt, { backgroundColor: theme.surface, borderColor: theme.border }]} />
      )}
      <View style={styles.trackMeta}>
        <Text style={[styles.trackName, { color: theme.text }]} numberOfLines={1}>{track.Name}</Text>
        <Text style={[styles.trackArtist, { color: theme.textDim }]} numberOfLines={1}>
          {track.AlbumArtist || track.Artists?.[0] || ''}
        </Text>
      </View>
      <Text style={[styles.trackArrow, { color: theme.textFaint }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Station card ──────────────────────────────────────────────────────────
const STATIONS = [
  { id: 'artist_mix',  label: 'Artist Mix',     icon: '🎤', subtitle: 'Based on an artist' },
  { id: 'album_mix',   label: 'Album Mix',       icon: '💿', subtitle: 'Based on an album' },
  { id: 'fire_mix',    label: 'Fire Mix',        icon: '🔥', subtitle: 'Coming soon' },
  { id: 'vibe_radio',  label: 'ViBE Radio',      icon: '📻', subtitle: 'Your full library shuffled' },
  { id: 'top_month',   label: 'Top This Month',  icon: '📈', subtitle: 'Your most played' },
];

function StationCard({ station, onPress, theme }) {
  const disabled = station.id === 'fire_mix';
  return (
    <TouchableOpacity
      onPress={() => !disabled && onPress?.(station)}
      style={[
        styles.stationCard,
        {
          backgroundColor: theme.surface,
          borderColor: disabled ? theme.border : theme.accent,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      activeOpacity={disabled ? 1 : 0.75}
    >
      <Text style={styles.stationIcon}>{station.icon}</Text>
      <Text style={[styles.stationLabel, { color: theme.text }]}>{station.label}</Text>
      <Text style={[styles.stationSub, { color: theme.textFaint }]}>{station.subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── Genre card ────────────────────────────────────────────────────────────
function GenreCard({ genre, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={() => onPress?.(genre)}
      style={[styles.genreCard, { borderColor: theme.border }]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[theme.accent + '44', theme.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.genreLabel, { color: theme.text }]}>{genre.Name}</Text>
    </TouchableOpacity>
  );
}

// ─── Main HomeScreen ───────────────────────────────────────────────────────
export function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const breathAnim = useRef(new Animated.Value(1)).current;

  const [recentTracks,  setRecentTracks]  = useState([]);
  const [recentAlbums,  setRecentAlbums]  = useState([]);
  const [topAlbums,     setTopAlbums]     = useState([]);
  const [genres,        setGenres]        = useState([]);
  const [artistCorner,  setArtistCorner]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  // Breathing bg animation
  useEffect(() => {
    const loop = () => Animated.sequence([
      Animated.timing(breathAnim, { toValue: 1.06, duration: 5000, useNativeDriver: true }),
      Animated.timing(breathAnim, { toValue: 1.00, duration: 5000, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) loop(); });
    loop();
  }, []);

  useEffect(() => {
    Promise.all([
      getRecentlyPlayed(30),
      getRecentAlbums(20),
      getTopAlbums(20),
      getGenres(30),
    ]).then(([played, added, top, genreData]) => {
      const tracks = played.Items  || [];
      const albums = added.Items   || [];
      const tops   = top.Items     || [];
      const genreList = genreData.Items || [];

      setRecentTracks(tracks);
      setRecentAlbums(albums);
      setTopAlbums(tops);
      setGenres(genreList);

      // Build Artist Corner from recently played unique artists
      const seen = new Set();
      const artists = [];
      for (const t of tracks) {
        const id   = t.AlbumArtistIds?.[0];
        const name = t.AlbumArtist || t.Artists?.[0];
        if (id && name && !seen.has(id)) {
          seen.add(id);
          artists.push({ id, name });
          if (artists.length >= 12) break;
        }
      }
      setArtistCorner(artists);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const bgArtUrl = recentAlbums[0]
    ? getImageUrl(recentAlbums[0].Id, 'Primary', 800)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Ambient breathing background */}
      {bgArtUrl && (
        <Animated.Image
          source={{ uri: bgArtUrl }}
          style={[styles.ambientBg, { transform: [{ scale: breathAnim }] }]}
          blurRadius={Platform.OS === 'ios' ? 80 : 25}
        />
      )}
      <LinearGradient
        colors={[theme.accent + '18', theme.background + 'CC', theme.background]}
        locations={[0, 0.35, 0.7]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >

        {/* ── Artist Corner ─────────────────────────────────────── */}
        {artistCorner.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Artist Corner" theme={theme} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {artistCorner.map(a => (
                <ArtistCard
                  key={a.id}
                  artistId={a.id}
                  artistName={a.name}
                  onPress={() => navigation?.push('Artist', { artistId: a.id, artistName: a.name })}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recently Played ───────────────────────────────────── */}
        {recentTracks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recently Played"
              theme={theme}
              onViewAll={() => {/* TODO: navigate to full list */}}
            />
            {recentTracks.slice(0, 7).map((track, i) => (
              <TrackRow
                key={track.Id + i}
                track={track}
                theme={theme}
                onPress={() => {/* TODO: play track */}}
              />
            ))}
          </View>
        )}

        {/* ── Recently Added ────────────────────────────────────── */}
        {recentAlbums.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recently Added in ViBE"
              theme={theme}
              onViewAll={() => {/* TODO */}}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {recentAlbums.slice(0, 10).map(album => (
                <AlbumCard
                  key={album.Id}
                  item={album}
                  theme={theme}
                  onPress={() => {/* TODO: navigate to album */}}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Stations ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Stations" theme={theme} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {STATIONS.map(s => (
              <StationCard
                key={s.id}
                station={s}
                theme={theme}
                onPress={() => {/* TODO: trigger station */}}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Top Albums ───────────────────────────────────────── */}
        {topAlbums.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Top Albums" theme={theme} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {topAlbums.slice(0, 10).map(album => (
                <AlbumCard
                  key={album.Id}
                  item={album}
                  theme={theme}
                  onPress={() => {/* TODO */}}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Genres ───────────────────────────────────────────── */}
        {genres.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Browse by Genre" theme={theme} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {genres.map(genre => (
                <GenreCard
                  key={genre.Id}
                  genre={genre}
                  theme={theme}
                  onPress={() => {/* TODO */}}
                />
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  ambientBg: {
    position: 'absolute',
    width: W * 1.2, height: H * 0.5,
    top: 0, left: -(W * 0.1),
  },

  section:      { paddingTop: 28 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  viewAll:      { fontSize: 13, fontWeight: '500' },
  hScroll:      { paddingLeft: 20 },

  // Artist cards
  artistCard:  { alignItems: 'center', marginRight: 16, width: ARTIST_SIZE + 8 },
  artistRing:  {
    width: ARTIST_SIZE, height: ARTIST_SIZE, borderRadius: ARTIST_SIZE / 2,
    borderWidth: 1.5, overflow: 'hidden',
  },
  artistImg:   { width: ARTIST_SIZE, height: ARTIST_SIZE },
  artistName:  { fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Album cards
  albumCard:   { marginRight: 14, width: ALBUM_CARD },
  albumArt:    {
    width: ALBUM_CARD, height: ALBUM_CARD, borderRadius: 10, borderWidth: 1,
  },
  albumArtEmpty: {},
  albumName:   { fontSize: 13, fontWeight: '600', marginTop: 8 },
  albumArtist: { fontSize: 11, marginTop: 3 },

  // Track rows
  trackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  trackArt:    { width: 48, height: 48, borderRadius: 6, borderWidth: 1 },
  trackMeta:   { flex: 1, marginLeft: 12 },
  trackName:   { fontSize: 14, fontWeight: '600' },
  trackArtist: { fontSize: 12, marginTop: 3 },
  trackArrow:  { fontSize: 20, paddingLeft: 8 },

  // Station cards
  stationCard: {
    width: 140, marginRight: 12, borderRadius: 12,
    padding: 16, borderWidth: 1,
  },
  stationIcon:  { fontSize: 24, marginBottom: 8 },
  stationLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  stationSub:   { fontSize: 11 },

  // Genre cards
  genreCard: {
    width: GENRE_W, height: GENRE_H, borderRadius: 12,
    marginRight: 12, justifyContent: 'flex-end',
    padding: 14, borderWidth: 1, overflow: 'hidden',
  },
  genreLabel: { fontSize: 16, fontWeight: '700' },
});

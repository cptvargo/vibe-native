import { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getArtistAlbums, getImageUrl } from '../api/jellyfin';
import { ARTIST_IMAGES } from '../config/artistImages';

const { width: W } = Dimensions.get('window');
const HERO_H   = 480;
const COL_GAP  = 12;
const COLS     = 2;
const CARD_W   = (W - 32 - COL_GAP) / COLS;

export function ArtistScreen({ route, navigation }) {
  const { artistId, artistName } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    getArtistAlbums(artistId)
      .then(r => setAlbums(r.Items || []))
      .catch(console.error);
  }, [artistId]);

  const localHero = ARTIST_IMAGES[artistName];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Hero ───────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {localHero ? (
            <Image source={localHero} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, { backgroundColor: theme.surface }]} />
          )}

          {/* Gradient: dark at bottom so text is readable */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', theme.background]}
            locations={[0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { top: insets.top + 12 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Artist name over hero */}
          <View style={styles.heroMeta}>
            <Text style={[styles.heroName, {
              textShadowColor: theme.accent,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 16,
            }]}>{artistName}</Text>
            <Text style={[styles.heroCount, { color: theme.accent }]}>
              {albums.length > 0 ? `${albums.length} album${albums.length !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Albums grid ────────────────────────────────────────── */}
        {albums.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Discography</Text>
            <View style={styles.grid}>
              {albums.map(album => {
                const artUrl = getImageUrl(album.Id, 'Primary', 400);
                return (
                  <TouchableOpacity
                    key={album.Id}
                    style={styles.albumCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Album', {
                      albumId:     album.Id,
                      albumName:   album.Name,
                      albumArtUrl: getImageUrl(album.Id, 'Primary', 600),
                      year:        album.ProductionYear,
                      artistName,
                    })}
                  >
                    {artUrl ? (
                      <Image
                        source={{ uri: artUrl }}
                        style={[styles.albumArt, { borderColor: theme.border }]}
                      />
                    ) : (
                      <View style={[styles.albumArt, { backgroundColor: theme.surface, borderColor: theme.border }]} />
                    )}
                    <Text style={[styles.albumName, { color: theme.text }]} numberOfLines={2}>
                      {album.Name}
                    </Text>
                    {album.ProductionYear ? (
                      <Text style={[styles.albumYear, { color: theme.accent + 'AA' }]}>
                        {album.ProductionYear}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    height: HERO_H,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: W,   // square crop = full image, no face cut off
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroCount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Albums
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COL_GAP,
  },
  albumCard: {
    width: CARD_W,
    marginBottom: 4,
  },
  albumArt: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 10,
    borderWidth: 1,
  },
  albumName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 18,
  },
  albumYear: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
});

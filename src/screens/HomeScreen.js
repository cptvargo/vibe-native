import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  Animated, Dimensions, TouchableOpacity, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecentAlbums, getRecentlyPlayed, getImageUrl, getAlbumImageUrl } from '../api/jellyfin';

const { width: W, height: H } = Dimensions.get('window');
const HERO_SIZE = W * 0.58;

const VIBE_STATES = [
  { id: 'deep',    label: 'DEEP' },
  { id: 'kinetic', label: 'KINETIC' },
  { id: 'drift',   label: 'DRIFT' },
  { id: 'focus',   label: 'FOCUS' },
  { id: 'ascend',  label: 'ASCEND' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [recentAlbums, setRecentAlbums] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [activeVibe, setActiveVibe] = useState('kinetic');
  const breathAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathe = () => {
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.06, duration: 4500, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1.0,  duration: 4500, useNativeDriver: true }),
      ]).start(() => breathe());
    };
    breathe();
  }, []);

  useEffect(() => {
    Promise.all([
      getRecentAlbums(12),
      getRecentlyPlayed(10),
    ]).then(([albums, tracks]) => {
      setRecentAlbums(albums.Items || []);
      setRecentTracks(tracks.Items || []);
    }).catch(console.error);
  }, []);

  const bgArtUrl  = recentAlbums[0] ? getImageUrl(recentAlbums[0].Id, 'Primary', 800) : null;
  const heroTrack = recentTracks[0] || null;
  const heroArtUrl = heroTrack ? getAlbumImageUrl(heroTrack, 600) : null;

  return (
    <View style={styles.container}>

      {/* Ambient breathing background */}
      {bgArtUrl ? (
        <Animated.Image
          source={{ uri: bgArtUrl }}
          style={[styles.ambientBg, { transform: [{ scale: breathAnim }] }]}
          blurRadius={Platform.OS === 'ios' ? 80 : 25}
        />
      ) : (
        <View style={styles.ambientBg} />
      )}

      {/* Dark gradient over background */}
      <LinearGradient
        colors={['rgba(8,8,16,0.25)', 'rgba(8,8,16,0.65)', 'rgba(8,8,16,0.97)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* System bar */}
        <View style={[styles.systemBar, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.systemLabel}>V · I · B · E</Text>
          <View style={styles.systemRight}>
            <View style={styles.statusDot} />
            <View style={[styles.statusDot, { opacity: 0.4 }]} />
          </View>
        </View>

        {/* Vibe state orbs */}
        <View style={styles.vibeRow}>
          {VIBE_STATES.map(vs => {
            const active = activeVibe === vs.id;
            return (
              <TouchableOpacity
                key={vs.id}
                onPress={() => setActiveVibe(vs.id)}
                style={[styles.vibeOrb, active && styles.vibeOrbActive]}
              >
                <Text style={[styles.vibeLabel, active && styles.vibeLabelActive]}>
                  {vs.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Now Vibe hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroGlowWrap}>
            <View style={styles.heroRim}>
              {heroArtUrl ? (
                <Image source={{ uri: heroArtUrl }} style={styles.heroArt} />
              ) : (
                <View style={[styles.heroArt, styles.heroEmpty]}>
                  <Text style={styles.heroEmptyText}>{'NOTHING\nPLAYING'}</Text>
                </View>
              )}
            </View>
          </View>

          {heroTrack ? (
            <View style={styles.heroMeta}>
              <Text style={styles.heroArtist} numberOfLines={1}>
                {(heroTrack.AlbumArtist || heroTrack.Artists?.[0] || '').toUpperCase()}
              </Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {heroTrack.Name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Signal Stream — recently played tracks */}
        {recentTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>S I G N A L   S T R E A M</Text>
            {recentTracks.slice(0, 7).map((track, i) => {
              const artUrl = getAlbumImageUrl(track, 300);
              return (
                <TouchableOpacity
                  key={track.Id + i}
                  activeOpacity={0.7}
                  style={[styles.fragment, { opacity: Math.max(0.4, 1 - i * 0.08) }]}
                >
                  {artUrl && (
                    <Image
                      source={{ uri: artUrl }}
                      style={styles.fragmentBg}
                      blurRadius={i * 2}
                    />
                  )}
                  <LinearGradient
                    colors={['rgba(8,8,16,0.1)', 'rgba(8,8,16,0.75)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.fragmentText}>
                    <Text style={styles.fragmentAlbum} numberOfLines={1}>
                      {track.Album || track.Name}
                    </Text>
                    <Text style={styles.fragmentArtist} numberOfLines={1}>
                      {track.AlbumArtist || ''}
                    </Text>
                  </View>
                  <Text style={styles.fragmentArrow}>↩</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Resonance — recent albums as color-blurred blocks */}
        {recentAlbums.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>R E S O N A N C E</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resonanceScroll}>
              {recentAlbums.map(album => (
                <TouchableOpacity key={album.Id} style={styles.resonanceBlock} activeOpacity={0.8}>
                  <Image
                    source={{ uri: getImageUrl(album.Id, 'Primary', 160) }}
                    style={styles.resonanceArt}
                    blurRadius={14}
                  />
                  <View style={styles.resonanceOverlay} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#080810' },

  ambientBg: {
    position: 'absolute',
    width: W * 1.2, height: H * 1.2,
    top: -(H * 0.1), left: -(W * 0.1),
  },

  scroll: { flex: 1 },

  // System bar
  systemBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 4,
  },
  systemLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10, letterSpacing: 6, fontWeight: '400',
  },
  systemRight:  { flexDirection: 'row', gap: 5 },
  statusDot:    { width: 5, height: 5, borderRadius: 3, backgroundColor: '#A855F7' },

  // Vibe states
  vibeRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', flexWrap: 'wrap',
    gap: 10, paddingHorizontal: 16, paddingVertical: 18,
  },
  vibeOrb: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    backgroundColor: 'rgba(168,85,247,0.04)',
  },
  vibeOrbActive: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.18)',
    shadowColor: '#A855F7', shadowRadius: 14,
    shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
  },
  vibeLabel:       { color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 3, fontWeight: '500' },
  vibeLabelActive: { color: '#E879F9' },

  // Hero
  heroSection:  { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 },
  heroGlowWrap: {
    width: HERO_SIZE + 48, height: HERO_SIZE + 48,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowRadius: 48, shadowOpacity: 0.65, shadowOffset: { width: 0, height: 0 },
  },
  heroRim: {
    width: HERO_SIZE, height: HERO_SIZE, borderRadius: HERO_SIZE / 2,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)',
    overflow: 'hidden',
  },
  heroArt: { width: HERO_SIZE, height: HERO_SIZE },
  heroEmpty: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmptyText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10, letterSpacing: 3, textAlign: 'center', lineHeight: 18,
  },
  heroMeta: { alignItems: 'center', marginTop: 22, paddingHorizontal: 32 },
  heroArtist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, letterSpacing: 3, marginBottom: 8,
  },
  heroTitle: {
    color: '#fff', fontSize: 22, fontWeight: '300',
    textAlign: 'center', lineHeight: 30,
  },

  // Sections
  section:      { paddingTop: 36, paddingHorizontal: 24 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9, letterSpacing: 4, marginBottom: 16,
  },

  // Signal Stream fragments
  fragment: {
    height: 64, borderRadius: 10, overflow: 'hidden',
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  fragmentBg: { position: 'absolute', width: '100%', height: '100%' },
  fragmentText: { flex: 1, paddingLeft: 18 },
  fragmentAlbum: { color: '#fff', fontSize: 14, fontWeight: '300' },
  fragmentArtist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, letterSpacing: 1, marginTop: 3,
  },
  fragmentArrow: {
    color: 'rgba(255,255,255,0.3)', fontSize: 18, paddingRight: 18,
  },

  // Resonance
  resonanceScroll: { marginHorizontal: -24, paddingHorizontal: 24 },
  resonanceBlock: {
    width: 88, height: 88, borderRadius: 10,
    overflow: 'hidden', marginRight: 10,
  },
  resonanceArt:     { width: 88, height: 88 },
  resonanceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,8,16,0.25)',
  },
});

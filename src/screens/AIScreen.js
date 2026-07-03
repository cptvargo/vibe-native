import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getAIAlbums, getImageUrl } from '../api/jellyfin';

const { width: W } = Dimensions.get('window');
const CARD_W = W * 0.42;

export function AIScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    getAIAlbums().then(r => setAlbums(r.Items || [])).catch(console.error);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#04040f' }]}>

      {/* Synthwave grid background */}
      <LinearGradient
        colors={['#0a0020', '#04040f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Neon horizon glow */}
      <View style={styles.horizonGlow} />
      <LinearGradient
        colors={['transparent', '#7C3AED33', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.horizonLine}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 20 }]}>
          <Text style={styles.aiLabel}>AI MUSIC</Text>
          <Text style={styles.aiSub}>ZÆYUS & Beyond</Text>
        </View>

        {/* Albums grid */}
        {albums.length > 0 ? (
          <View style={styles.grid}>
            {albums.map(album => {
              const artUrl = getImageUrl(album.Id, 'Primary', 400);
              return (
                <TouchableOpacity
                  key={album.Id}
                  style={styles.gridCard}
                  activeOpacity={0.8}
                  onPress={() => {/* TODO */}}
                >
                  <View style={[styles.cardGlow, { shadowColor: theme.accent }]}>
                    {artUrl ? (
                      <Image source={{ uri: artUrl }} style={styles.cardArt} />
                    ) : (
                      <View style={[styles.cardArt, { backgroundColor: '#1a0030' }]} />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(4,4,15,0.85)']}
                      style={styles.cardGradient}
                    />
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardName} numberOfLines={2}>{album.Name}</Text>
                      {album.ProductionYear ? (
                        <Text style={styles.cardYear}>{album.ProductionYear}</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No AI albums found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },

  horizonGlow: {
    position: 'absolute',
    top: 220, left: 0, right: 0, height: 120,
    backgroundColor: '#7C3AED',
    opacity: 0.06,
  },
  horizonLine: {
    position: 'absolute',
    top: 275, left: 0, right: 0, height: 1,
  },

  header:     { paddingHorizontal: 20, paddingBottom: 24 },
  aiLabel: {
    fontSize: 28, fontWeight: '800', color: '#E879F9',
    letterSpacing: 6,
    textShadowColor: '#E879F9',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  aiSub: {
    fontSize: 13, color: 'rgba(232,121,249,0.5)',
    letterSpacing: 3, marginTop: 4,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
  },
  gridCard:    { width: CARD_W },
  cardGlow: {
    borderRadius: 12, overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 8,
  },
  cardArt:     { width: CARD_W, height: CARD_W, borderRadius: 12 },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_W * 0.55,
    borderRadius: 12,
  },
  cardMeta: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
  },
  cardName: {
    color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2,
  },
  cardYear: {
    color: 'rgba(232,121,249,0.7)', fontSize: 11, marginTop: 2, letterSpacing: 1,
  },

  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
});

/**
 * useUltraBlurPalette
 *
 * Extracts a full Vibrant palette for the active track across four tiers:
 *
 *   Tier 0a – persistent disk cache  0ms,    works everywhere, survives restarts
 *   Tier 0b – session memory cache   0ms,    works everywhere, within one session
 *   Tier 1  – native ImageColors     ~20ms,  on-device, works everywhere (EAS build)
 *   Tier 2  – proxy server           ~50ms,  home LAN only (richest palette)
 *   Tier 3  – BlurHash decode        ~5ms,   pure JS, always available
 *
 * Palette storage: once computed, a palette is written to AsyncStorage under
 * the track's Jellyfin item ID. Subsequent plays across any session hit Tier 0a.
 * The on-disk cache grows to match your library size (~150 bytes per track).
 */

import { useState, useEffect } from 'react';
import { NativeModulesProxy } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blurHashToDominantColor } from '../utils/color';
import { EMPTY_PALETTE } from '../context/ThemeContext';

const HAS_NATIVE_COLORS = !!NativeModulesProxy.ImageColors;
const COLOR_SERVER = process.env.EXPO_PUBLIC_COLOR_SERVER_URL || null;
const STORAGE_KEY = 'vibe_palettes_v1';

// ── Persistent cache (survives app restarts) ──────────────────────────────────
// Lazily loaded from AsyncStorage on first access.

let diskCache = null; // null = not loaded yet, {} = loaded (may be empty)
let diskCacheLoadPromise = null;

async function getDiskCache() {
  if (diskCache !== null) return diskCache;
  if (diskCacheLoadPromise) return diskCacheLoadPromise;

  diskCacheLoadPromise = AsyncStorage.getItem(STORAGE_KEY)
    .then(raw => {
      diskCache = raw ? JSON.parse(raw) : {};
      return diskCache;
    })
    .catch(() => {
      diskCache = {};
      return diskCache;
    });

  return diskCacheLoadPromise;
}

async function writeToDisk(trackId, palette) {
  try {
    const cache = await getDiskCache();
    cache[trackId] = palette;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {});
  } catch { /* non-fatal */ }
}

// Session cache (keyed by track.id) — for the current session
const sessionCache = new Map();

function setCached(trackId, palette) {
  sessionCache.set(trackId, palette);
  writeToDisk(trackId, palette);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nativeResultToPalette(result) {
  if (!result) return null;
  let p;

  if (result.platform === 'ios') {
    p = {
      vibrant:      result.primary    ?? null,
      lightVibrant: result.secondary  ?? null,
      darkVibrant:  null,
      muted:        result.background ?? null,
      lightMuted:   result.detail     ?? null,
      darkMuted:    null,
    };
  } else if (result.platform === 'android') {
    p = {
      vibrant:      result.vibrant      ?? null,
      lightVibrant: result.lightVibrant ?? null,
      darkVibrant:  result.darkVibrant  ?? null,
      muted:        result.muted        ?? null,
      lightMuted:   result.lightMuted   ?? null,
      darkMuted:    result.darkMuted    ?? null,
    };
  } else return null;

  return Object.values(p).some(v => v !== null) ? p : null;
}

// Proxy palette cache keyed by color URL
const proxyCache = new Map();

async function fetchProxyPalette(colorUrl) {
  if (proxyCache.has(colorUrl)) return proxyCache.get(colorUrl);
  if (!COLOR_SERVER) return null;

  const endpoint = `${COLOR_SERVER}/color?url=${encodeURIComponent(colorUrl)}`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return null;

  const data = await res.json();
  const p = {
    vibrant:      data.vibrant      ?? (data.color ?? null),
    lightVibrant: data.lightVibrant ?? null,
    darkVibrant:  data.darkVibrant  ?? null,
    muted:        data.muted        ?? null,
    lightMuted:   data.lightMuted   ?? null,
    darkMuted:    data.darkMuted    ?? null,
  };

  if (Object.values(p).some(v => v !== null)) {
    proxyCache.set(colorUrl, p);
    return p;
  }
  return null;
}

// ── Prewarm ───────────────────────────────────────────────────────────────────

export async function prewarmPalette(track) {
  if (!track) return;

  // Check session cache first
  if (sessionCache.has(track.id)) return;

  // Check disk cache
  const cache = await getDiskCache();
  if (cache[track.id]) {
    sessionCache.set(track.id, cache[track.id]);
    return;
  }

  const colorUrl = track._colorUrl || track.artwork;

  try {
    if (HAS_NATIVE_COLORS && colorUrl) {
      const { getColors } = require('react-native-image-colors');
      const result = await getColors(colorUrl, {
        fallback: '#7C3AED', cache: true, key: `${track.id}_color`,
      });
      const p = nativeResultToPalette(result);
      if (p) { setCached(track.id, p); return; }
    }

    if (colorUrl) {
      const p = await fetchProxyPalette(colorUrl).catch(() => null);
      if (p) { setCached(track.id, p); return; }
    }

    const color = blurHashToDominantColor(track._blurHash);
    if (color) setCached(track.id, { ...EMPTY_PALETTE, vibrant: color, lightVibrant: color });
  } catch { /* silent */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUltraBlurPalette(track) {
  const [palette, setPalette] = useState(EMPTY_PALETTE);

  useEffect(() => {
    if (!track) { setPalette(EMPTY_PALETTE); return; }

    // Tier 0b: session memory — instant
    if (sessionCache.has(track.id)) {
      setPalette(sessionCache.get(track.id));
      return;
    }

    let alive = true;

    (async () => {
      // Tier 0a: persistent disk cache — instant after first play
      const cache = await getDiskCache();
      if (!alive) return;
      if (cache[track.id]) {
        sessionCache.set(track.id, cache[track.id]);
        setPalette(cache[track.id]);
        return;
      }

      const colorUrl = track._colorUrl || track.artwork;

      // Tier 1: native on-device (32px image, ~20ms)
      if (HAS_NATIVE_COLORS && colorUrl) {
        try {
          const { getColors } = require('react-native-image-colors');
          const result = await getColors(colorUrl, {
            fallback: '#7C3AED', cache: true, key: `${track.id}_color`,
          });
          if (!alive) return;
          const p = nativeResultToPalette(result);
          if (p) { setCached(track.id, p); setPalette(p); return; }
        } catch { /* fall through */ }
      }

      if (!alive) return;

      // Tier 2: proxy server
      if (colorUrl) {
        try {
          const p = await fetchProxyPalette(colorUrl);
          if (!alive) return;
          if (p) { setCached(track.id, p); setPalette(p); return; }
        } catch { /* proxy unreachable */ }
      }

      // Tier 3: BlurHash
      if (!alive) return;
      const color = blurHashToDominantColor(track._blurHash);
      if (color) {
        const p = { ...EMPTY_PALETTE, vibrant: color, lightVibrant: color };
        setCached(track.id, p);
        setPalette(p);
      } else {
        setPalette(EMPTY_PALETTE);
      }
    })();

    return () => { alive = false; };
  }, [track?.id]);

  return palette;
}

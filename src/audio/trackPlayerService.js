/**
 * Vibe · react-native-track-player service
 *
 * This single file replaces the entire VibePlayer.js + NativeAudioPlugin.swift
 * + AVAudioSession setup from the Capacitor version. The library handles:
 *   - Background audio & AVAudioSession
 *   - Lock screen controls (MPRemoteCommandCenter)
 *   - Now Playing info (MPNowPlayingInfoCenter)
 *   - Interruption handling (calls, Siri)
 *   - Crossfade (via capabilities)
 */

import TrackPlayer, { Event, Capability } from 'react-native-track-player';
import { getStreamUrl, getAlbumImageUrl, getColorExtractionUrl, reportPlaybackProgress, reportPlaybackStopped } from '../api/jellyfin';

// Called once on app start — registers the background service
export async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 50, // 50 MB audio cache
      minBuffer: 15,            // seconds buffered before playback starts
      maxBuffer: 60,            // seconds buffered ahead
      playBuffer: 1,            // seconds needed to start playing (was default 2.5s)
      backBuffer: 30,           // seconds kept in back-buffer for seeking back
    });
  } catch (e) {
    // Fast Refresh can re-run this; ignore if player already initialized
    if (!e.message?.includes('already been initialized')) throw e;
  }

  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    progressUpdateEventInterval: 10, // seconds between progress events
  });
}

// Convert a Jellyfin track object to the shape TrackPlayer expects
export function toTrackPlayerTrack(jellyfinTrack) {
  // Jellyfin returns ImageBlurHashes.Primary as { [imageTag]: hashString }
  const blurMap = jellyfinTrack.ImageBlurHashes?.Primary;
  const blurHash = blurMap ? Object.values(blurMap)[0] : null;
  const albumId = jellyfinTrack.AlbumId || jellyfinTrack.ParentId || jellyfinTrack.Id;
  return {
    id:        jellyfinTrack.Id,
    url:       getStreamUrl(jellyfinTrack.Id),
    title:     jellyfinTrack.Name,
    artist:    jellyfinTrack.AlbumArtist || jellyfinTrack.Artists?.[0] || 'Unknown',
    album:     jellyfinTrack.Album || '',
    artwork:   getAlbumImageUrl(jellyfinTrack, 600),
    duration:  jellyfinTrack.RunTimeTicks ? jellyfinTrack.RunTimeTicks / 10_000_000 : 0,
    _colorUrl: getColorExtractionUrl(albumId),
    _blurHash: blurHash,
    _jellyfin: jellyfinTrack,
  };
}

// Load a queue of Jellyfin tracks and start playing from startIndex
export async function playQueue(tracks, startIndex = 0) {
  const items = Array.isArray(tracks) ? tracks : [tracks];
  await TrackPlayer.reset();
  await TrackPlayer.add(items.map(toTrackPlayerTrack));
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  await TrackPlayer.play();
}

// Background service handler — required by react-native-track-player
// This runs in a headless JS task when the app is in the background
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause,    () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay,     () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteNext,     () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek,     ({ position }) => TrackPlayer.seekTo(position));

  // Report progress to Jellyfin every 10s
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ({ position, track }) => {
    const tracks = await TrackPlayer.getQueue();
    const current = tracks[track];
    if (current?._jellyfin?.Id && position > 0) {
      reportPlaybackProgress(current._jellyfin.Id, Math.floor(position * 10_000_000));
    }
  });

  // Report stopped when track changes
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async ({ lastIndex, lastPosition, lastTrack }) => {
    if (lastTrack?._jellyfin?.Id && lastPosition > 0) {
      reportPlaybackStopped(lastTrack._jellyfin.Id, Math.floor(lastPosition * 10_000_000));
    }
  });
}

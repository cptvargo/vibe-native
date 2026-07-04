import { VIBE_CONFIG } from '../config/vibeConfig';

const { token: TOKEN, userId: USER_ID } = VIBE_CONFIG;
let _activeUrl = VIBE_CONFIG.serverUrl;
const VIBE_LIB = 'f7cfaffc15ccf8bd61c77386dfdf9805';
const url = () => _activeUrl;

export function initServerUrl() {
  const { localUrl, serverUrl } = VIBE_CONFIG;
  if (serverUrl) {
    fetch(`${serverUrl}/System/Info/Public`, { cache: 'no-store' }).catch(() => {});
    setInterval(() => fetch(`${serverUrl}/System/Info/Public`, { cache: 'no-store' }).catch(() => {}), 30000);
  }
  if (!localUrl) return;
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 1500);
  fetch(`${localUrl}/System/Info/Public`, { signal: ctrl.signal, cache: 'no-store' })
    .then(r => { if (r.ok) { _activeUrl = localUrl; console.log('[Vibe] LAN detected'); } })
    .catch(() => {});
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Emby-Authorization': `MediaBrowser Client="Vibe", Device="VibeApp", DeviceId="vibe-001", Version="1.0.0", Token="${TOKEN}"`,
});

async function request(path) {
  const res = await fetch(`${url()}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Jellyfin ${res.status}: ${path}`);
  return res.json();
}

export async function getRecentlyPlayed(limit = 20) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&IsPlayed=true&Filters=IsPlayed`);
}
export async function getRecentlyAdded(limit = 20) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}
export async function getTopAlbums(limit = 20) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=PlayCount&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`);
}
export async function getRecentAlbums(limit = 20) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`);
}
export async function getPlayHistory(limit = 50) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&IsPlayed=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}
export async function getMostPlayedThisMonth(limit = 20) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&SortBy=PlayCount&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}
export async function getAlbums(limit = 200) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio&SortBy=SortName`);
}
export async function getAlbumTracks(albumId) {
  return request(`/Users/${USER_ID}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&Fields=PrimaryImageAspectRatio,AudioInfo,ArtistItems,AlbumArtistIds&SortBy=IndexNumber`);
}
export async function getArtists(limit = 200) {
  return request(`/Artists/AlbumArtists?UserId=${USER_ID}&ParentId=${VIBE_LIB}&Limit=${limit}&Fields=PrimaryImageAspectRatio,Overview&SortBy=SortName`);
}
export async function getAllTracks(limit = 500) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=SortName`);
}
export async function getInstantMix(itemId, limit = 50) {
  return request(`/Items/${itemId}/InstantMix?UserId=${USER_ID}&Limit=${limit}&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}
export async function getVibeRadio(limit = 100) {
  return request(`/Users/${USER_ID}/Items?ParentId=${VIBE_LIB}&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&SortBy=Random&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}
export async function search(query, limit = 40) {
  const [items, artists] = await Promise.all([
    request(`/Users/${USER_ID}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio,MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`),
    request(`/Artists?UserId=${USER_ID}&SearchTerm=${encodeURIComponent(query)}&Limit=10&Fields=PrimaryImageAspectRatio`),
  ]);
  return { Items: [...(artists.Items || []).map(a => ({ ...a, Type: 'MusicArtist' })), ...(items.Items || [])] };
}
export async function getArtistDetails(artistId) {
  return request(`/Users/${USER_ID}/Items/${artistId}`);
}
export async function getArtistAlbums(artistId) {
  return request(`/Users/${USER_ID}/Items?AlbumArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true&Fields=PrimaryImageAspectRatio&SortBy=ProductionYear&SortOrder=Descending`);
}
export async function getArtistTracks(artistId, limit = 30) {
  return request(`/Users/${USER_ID}/Items?ArtistIds=${artistId}&IncludeItemTypes=Audio&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=Random&Limit=${limit}`);
}
export async function getAIAlbums() {
  return request(`/Users/${USER_ID}/Items?ParentId=c05385a3a801fb8a9d4ee6a3a208bd23&IncludeItemTypes=MusicAlbum&Recursive=true&Fields=PrimaryImageAspectRatio,ProductionYear&SortBy=DateCreated&SortOrder=Descending`);
}
export async function getGenres(limit = 30) {
  return request(`/Genres?UserId=${USER_ID}&ParentId=${VIBE_LIB}&Limit=${limit}&SortBy=SortName&IncludeItemTypes=Audio`);
}
export async function getAITracks() {
  return request(`/Users/${USER_ID}/Items?ParentId=c05385a3a801fb8a9d4ee6a3a208bd23&IncludeItemTypes=Audio&Recursive=true&Fields=RunTimeTicks,AlbumId,PrimaryImageAspectRatio,AudioInfo&SortBy=Album,ParentIndexNumber,IndexNumber&SortOrder=Ascending`);
}

// Tiny image for color extraction only — 32×32px, quality 50 → ~2 KB, ~5ms download
export function getColorExtractionUrl(itemId) {
  if (!itemId) return null;
  return `${url()}/Items/${itemId}/Images/Primary?fillHeight=32&fillWidth=32&quality=50&api_key=${TOKEN}`;
}

export function getStreamUrl(itemId) {
  return `${url()}/Audio/${itemId}/stream?static=true&api_key=${TOKEN}&UserId=${USER_ID}&Container=m4a,mp3,flac,wav,aac,ogg`;
}
export function getImageUrl(itemId, type = 'Primary', size = 400) {
  if (!itemId) return null;
  return `${url()}/Items/${itemId}/Images/${type}?fillHeight=${size}&fillWidth=${size}&quality=90&api_key=${TOKEN}`;
}
export function getAlbumImageUrl(track, size = 400) {
  const albumId = track?.AlbumId || track?.ParentId;
  return getImageUrl(albumId || track?.Id, 'Primary', size);
}
export function getArtistImageUrl(artistId, size = 200) {
  if (!artistId) return null;
  return `${url()}/Items/${artistId}/Images/Primary?fillHeight=${size}&fillWidth=${size}&quality=90&api_key=${TOKEN}`;
}

export async function reportPlaybackStart(itemId) {
  return fetch(`${url()}/Sessions/Playing`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ ItemId: itemId, CanSeek: true, IsPaused: false }),
  }).catch(() => {});
}
export async function reportPlaybackProgress(itemId, positionTicks) {
  return fetch(`${url()}/Sessions/Playing/Progress`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
  }).catch(() => {});
}
export async function reportPlaybackStopped(itemId, positionTicks) {
  return fetch(`${url()}/Sessions/Playing/Stopped`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
  }).catch(() => {});
}
export async function markPlayed(itemId) {
  return fetch(`${url()}/Users/${USER_ID}/PlayedItems/${itemId}`, {
    method: 'POST', headers: headers(),
  }).catch(() => {});
}

export { USER_ID, request };

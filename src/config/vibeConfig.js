// Expo uses EXPO_PUBLIC_ prefix for client-side env vars
// Set these in .env or via EAS Secrets for CI builds
export const VIBE_CONFIG = {
  serverUrl: process.env.EXPO_PUBLIC_JELLYFIN_URL       || '',
  localUrl:  process.env.EXPO_PUBLIC_JELLYFIN_LOCAL_URL || '',
  token:     process.env.EXPO_PUBLIC_JELLYFIN_API_KEY   || '',
  userId:    process.env.EXPO_PUBLIC_JELLYFIN_USER_ID   || '',
};

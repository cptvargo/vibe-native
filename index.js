import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/audio/trackPlayerService';

// Register the background service — this is what keeps audio alive
// when the app is backgrounded or the screen is locked
TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);

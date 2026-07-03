import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/audio/trackPlayerService';

TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);

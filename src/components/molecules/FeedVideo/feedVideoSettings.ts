import type { SurfaceType } from 'expo-video';

// The one switch for how video is drawn on Android. 'surfaceView' (expo-video's
// default) is lighter; 'textureView' clips to rounded corners and sits better
// under overlays, at a little more memory. Change it here after the phone check.
export const VIDEO_SURFACE_TYPE: SurfaceType = 'surfaceView';

// Saving videos on the phone (videoCache.ts): stream the first time, save in
// the background after ~2 s of play, play the saved file next time. Off =
// every showing streams, exactly as with expo-av.
export const VIDEO_SAVING_ENABLED = true;

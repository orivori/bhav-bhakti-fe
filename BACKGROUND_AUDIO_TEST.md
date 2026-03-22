# Background Audio Test Instructions

## Changes Made:

### 1. Global Audio Session (app/_layout.tsx)
- ✅ Added global audio session initialization at app startup
- ✅ Configured `staysActiveInBackground: true` globally

### 2. Enhanced Audio Player (app/(main)/audio-player.tsx)
- ✅ Added app state monitoring to maintain audio during background transitions
- ✅ Re-initializes audio session when app goes to background
- ✅ Checks and resumes playback if needed when backgrounded
- ✅ Activates audio session before each playback start

### 3. App Configuration (app.json)
- ✅ iOS: Added `backgroundModes: ["audio"]`
- ✅ iOS: Added `UIBackgroundModes: ["audio"]` in infoPlist
- ✅ Android: Added `WAKE_LOCK` and `FOREGROUND_SERVICE` permissions

## How to Test:

### IMPORTANT: Must rebuild the app since app.json changed!

1. **Build the app** (required for app.json changes):
   ```bash
   # For development build
   npx expo run:ios
   # or
   npx expo run:android
   ```

2. **Test on Physical Device** (simulators don't support background audio properly):
   - Install app on real iPhone/Android device
   - Open the app and navigate to audio player
   - Start playing a mantra
   - Press home button or lock screen
   - Audio should continue playing

3. **Check Logs** (if testing fails):
   ```bash
   npx expo logs
   ```
   Look for these log messages:
   - `✅ Global audio session initialized for background playback`
   - `📱 App going to background, ensuring audio continues...`
   - `🔄 Resuming audio in background...`

## Expected Behavior:
- ✅ Audio continues when screen locks
- ✅ Audio continues when app is backgrounded
- ✅ Lock screen shows media controls
- ✅ Audio handles phone calls and notifications properly

## If Still Not Working:
1. Check device settings - ensure app has audio permissions
2. Try different audio file (some formats work better)
3. Test with headphones connected
4. Check if Do Not Disturb mode is affecting playback

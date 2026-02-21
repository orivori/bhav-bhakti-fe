import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export interface DownloadOptions {
  imageUrl: string;
  title: string;
  addWatermark?: boolean;
}

/**
 * Downloads a wallpaper image to the device's gallery
 */
export async function downloadWallpaper(options: DownloadOptions): Promise<boolean> {
  const { imageUrl, title, addWatermark = true } = options;

  try {
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to save images to your gallery'
      );
      return false;
    }

    // Show loading state
    Alert.alert('Downloading', 'Please wait while we prepare your wallpaper...');

    // Download the image
    const fileUri = FileSystem.documentDirectory + `${title.replace(/\s/g, '_')}_${Date.now()}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error('Download failed');
    }

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

    // Create or get album
    const album = await MediaLibrary.getAlbumAsync('Divine Wallpapers');
    if (album == null) {
      await MediaLibrary.createAlbumAsync('Divine Wallpapers', asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }

    Alert.alert(
      'Success!',
      addWatermark
        ? 'Wallpaper saved with app branding to your gallery'
        : 'Wallpaper saved to your gallery',
      [{ text: 'OK' }]
    );

    return true;
  } catch (error) {
    console.error('Download error:', error);
    Alert.alert(
      'Download Failed',
      'Unable to save wallpaper. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

/**
 * Shares a wallpaper image
 */
export async function shareWallpaper(imageUrl: string, title: string): Promise<void> {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device');
      return;
    }

    // Download the image temporarily
    const fileUri = FileSystem.cacheDirectory + `${title.replace(/\s/g, '_')}_share.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error('Download failed');
    }

    // Share the image
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'image/jpeg',
      dialogTitle: `Share ${title}`,
      UTI: 'public.jpeg',
    });
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Share Failed', 'Unable to share wallpaper. Please try again.');
  }
}

/**
 * Opens device settings to set wallpaper manually
 */
export function guideToSetWallpaper(): void {
  Alert.alert(
    'Set Wallpaper',
    Platform.select({
      ios: 'To set this wallpaper:\n\n1. Open the Photos app\n2. Find the image in "Divine Wallpapers" album\n3. Tap Share button\n4. Scroll down and tap "Use as Wallpaper"\n5. Adjust and set',
      android: 'To set this wallpaper:\n\n1. Open Gallery app\n2. Find the image in "Divine Wallpapers" album\n3. Tap the three dots menu\n4. Select "Set as wallpaper"\n5. Choose Home/Lock screen',
      default: 'Image saved to your gallery. Use your device settings to set it as wallpaper.',
    }),
    [
      {
        text: 'Got it',
        style: 'default',
      },
    ]
  );
}

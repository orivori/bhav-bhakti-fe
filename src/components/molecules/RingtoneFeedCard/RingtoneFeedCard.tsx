import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Linking,
  Dimensions,
  AppState} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
// Removed expo-intent-launcher dependency for smaller bundle size
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';

interface RingtoneFeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  onPlaybackStart?: (feedId: string, stop: () => void) => void;
  onPlaybackEnd?: (feedId: string) => void;
}

export default function RingtoneFeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
  onPlaybackStart,
  onPlaybackEnd,
}: RingtoneFeedCardProps) {
  const { language } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSettingRingtone, setIsSettingRingtone] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Local state for like management
  const [localIsLiked, setLocalIsLiked] = useState(feed.isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(feed.likesCount);

  // Sync local state with feed prop changes
  useEffect(() => {
    setLocalIsLiked(feed.isLiked);
    setLocalLikesCount(feed.likesCount);
  }, [feed.isLiked, feed.likesCount]);

  const { toggleLike, incrementDownload, incrementShare, incrementView } = useFeedStore();

  // Get the main audio media
  const audioMedia = feed.media.find(m => m.type === 'audio') || feed.media[0];
  const audioSourceUri = audioMedia.audioUrl || audioMedia.mediaUrl;

  // One stable, predictable local filename per ringtone - derived from the
  // title, not the feed ID/a timestamp - so playback caching, download, and
  // set-as-ringtone all resolve to and share the exact same cached file.
  const sanitizeForFilename = (text: string): string =>
    text
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_]/gu, '');

  const getAudioFileExtension = (audioUri: string): string => {
    const pathWithoutQuery = audioUri.split('?')[0];
    const urlParts = pathWithoutQuery.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';
    const supportedExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
    return supportedExtensions.includes(extension) ? extension : 'mp3';
  };

  const rawTitle = feed.title?.en || Object.values(feed.title || {}).find(Boolean) || '';
  const sanitizedTitle = sanitizeForFilename(rawTitle);
  const localFileName = `${sanitizedTitle || `ringtone_${feed.id}`}.${
    audioSourceUri ? getAudioFileExtension(audioSourceUri) : 'mp3'
  }`;
  const localFileUri = FileSystem.documentDirectory + localFileName;

  // Returns the local cached copy of this ringtone, downloading it once if
  // it isn't already on disk. Shared by playback, download, and
  // set-as-ringtone so they never each create their own separate file.
  //
  // Known gap, deliberately deferred: no concurrency guard. If two of the
  // three callers race before any cache exists (e.g. Download and Play
  // tapped almost simultaneously), both can pass the getInfoAsync check and
  // independently downloadAsync to the same path. Low real-world risk at
  // current scale (worst case is a harmless redundant download, not
  // corruption) - revisit with an in-flight-download tracker if this ever
  // becomes a real problem.
  const ensureLocalFile = async (): Promise<string> => {
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists) {
      console.log('📦 Using cached ringtone file:', localFileUri);
      return localFileUri;
    }

    if (!audioSourceUri) {
      throw new Error('No audio file found for this ringtone.');
    }

    console.log('⬇️ No cached file found, downloading to:', localFileUri);
    const downloadResult = await FileSystem.downloadAsync(audioSourceUri, localFileUri);
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    return downloadResult.uri;
  };

  // Cleanup sound when component unmounts. Audio session mode (background
  // playback, ducking, etc.) is configured once, app-wide, in app/_layout.tsx
  // - this component intentionally does not call setAudioModeAsync, since
  // that would overwrite the shared session for the whole app.
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
        onPlaybackEnd?.(feed.id.toString());
      }
    };
  }, [sound]);

  // Stop this ringtone if the app is backgrounded/inactive while it's
  // playing. The app-wide session is configured to survive backgrounding
  // (for future long-form content), so without this, a playing ringtone
  // would keep going after the phone is locked or the user switches apps.
  // Scoped to only subscribe while THIS card is actually playing, so idle
  // cards in the list never hold an AppState listener.
  useEffect(() => {
    if (!isPlaying || !sound) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        console.log('📵 App backgrounded/inactive, stopping ringtone playback...');
        setIsPlaying(false);
        setPlaybackPosition(0);
        onPlaybackEnd?.(feed.id.toString());
        sound.unloadAsync().then(() => {
          setSound(null);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isPlaying, sound, onPlaybackEnd, feed.id]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const handlePlayPause = async () => {
    console.log('🎵 Play/Pause button pressed, isPlaying:', isPlaying, 'sound exists:', !!sound);

    try {
      if (sound) {
        // Check if sound is actually loaded
        const status = await sound.getStatusAsync();
        console.log('🔍 Sound status:', status);

        if (status.isLoaded) {
          if (isPlaying) {
            console.log('⏸️ Pausing audio, resetting position...');
            // stopAsync (not pauseAsync) so this behaves as a quick-preview
            // list, not a resumable player: re-pressing play after a manual
            // pause starts from 0, it doesn't resume where it left off.
            await sound.stopAsync();
            setIsPlaying(false);
            setPlaybackPosition(0);
            onPlaybackEnd?.(feed.id.toString());
          } else {
            console.log('▶️ Resuming audio...');
            onPlaybackStart?.(feed.id.toString(), () => {
              sound.stopAsync();
              setIsPlaying(false);
              setPlaybackPosition(0);
            });
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        } else {
          console.log('🔄 Sound exists but not loaded, recreating...');
          // Sound exists but not loaded, clean it up and recreate
          await sound.unloadAsync();
          setSound(null);
        }
      }

      // Create new sound
      setIsLoading(true);
      console.log('🎧 Audio source URI:', audioSourceUri);
      console.log('🎼 Audio media:', audioMedia);

      if (audioSourceUri) {
        const localUri = await ensureLocalFile();
        console.log('📱 Creating new sound instance from local file:', localUri);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: localUri },
          { shouldPlay: true }
        );

        console.log('✅ Sound created successfully');
        setSound(newSound);
        setIsPlaying(true);
        onPlaybackStart?.(feed.id.toString(), () => {
          // stopAsync, not pauseAsync - see note on the resume branch above.
          newSound.stopAsync();
          setIsPlaying(false);
          setPlaybackPosition(0);
        });

        // Set up playback status updates
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);

            // Update playing state based on actual playback status
            setIsPlaying(status.isPlaying || false);

            if (status.didJustFinish) {
              console.log('🏁 Audio finished playing');
              setIsPlaying(false);
              setPlaybackPosition(0);
              onPlaybackEnd?.(feed.id.toString());
              // Clean up the sound when finished
              newSound.unloadAsync().then(() => {
                setSound(null);
              });
            }
          } else {
            console.log('⚠️ Sound became unloaded');
            setIsPlaying(false);
            setPlaybackPosition(0);
            setSound(null);
            onPlaybackEnd?.(feed.id.toString());
          }
        });

        // Track view
        try {
          await feedService.viewFeed(feed.id.toString());
          incrementView(feed.id.toString());
          console.log('📊 View tracked successfully');
        } catch (viewError) {
          console.error('Error tracking view:', viewError);
          // Don't show alert for view tracking errors
        }
      } else {
        console.error('❌ No audio URI found');
        Alert.alert('Error', 'No audio file found for this ringtone.');
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      Alert.alert('Error', 'Failed to play ringtone. Please try again.');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    console.log('❤️ Like button pressed for ringtone:', feed.id, 'current localIsLiked:', localIsLiked, 'localCount:', localLikesCount);

    if (onLike) {
      // Use parent's like handler (recommended approach)
      onLike(feed.id.toString());
    } else {
      // Manage like state locally for immediate UI feedback
      try {
        // Store current state
        const wasLiked = localIsLiked;
        const currentCount = localLikesCount;

        // Optimistically update UI immediately
        if (wasLiked) {
          console.log('🔄 Unliking ringtone...');
          setLocalIsLiked(false);
          setLocalLikesCount(Math.max(0, currentCount - 1)); // Ensure count doesn't go below 0

          // Make API call
          await feedService.unlikeFeed(feed.id.toString());
          console.log('✅ Successfully unliked ringtone');
        } else {
          console.log('🔄 Liking ringtone...');
          setLocalIsLiked(true);
          setLocalLikesCount(currentCount + 1);

          // Make API call
          await feedService.likeFeed(feed.id.toString());
          console.log('✅ Successfully liked ringtone');
        }

        // Also update the store for consistency (optional)
        toggleLike(feed.id.toString());
      } catch (error) {
        console.error('❌ Error with like API, reverting local state:', error);

        // Revert local state on error
        setLocalIsLiked(feed.isLiked);
        setLocalLikesCount(feed.likesCount);

        Alert.alert('Error', 'Failed to like the ringtone. Please try again.');
      }
    }
  };

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const result = await Share.share({
        message: (feed.caption || feed.title?.[language] || feed.title?.en)
          ? `Check out this ringtone: ${feed.caption || feed.title?.[language] || feed.title?.en}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing ringtone from Bhav Bhakti App!',
        url: audioMedia.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing ringtone:', error);
      Alert.alert('Error', 'Failed to share the ringtone. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !feed.allowDownloads) return;

    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save ringtone to your device.');
        return;
      }

      const localUri = await ensureLocalFile();
      // Known gap, deliberately deferred: saveToLibraryAsync has no native
      // dedup - repeated taps create separate, uniquified entries in the OS
      // media library even though ensureLocalFile reuses the same cached
      // file. Cosmetic only (extra library entries), not a functional or
      // cost issue - the actual cached file is correctly deduped. Deferred
      // until real user feedback justifies the fix.
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Success', 'Ringtone saved to your device!');

      await feedService.downloadFeed(feed.id.toString());
      incrementDownload(feed.id.toString());
      onDownload?.(feed.id.toString());
    } catch (error) {
      console.error('Error downloading ringtone:', error);
      Alert.alert('Error', 'Failed to download ringtone. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSetRingtone = async () => {
    if (isSettingRingtone) return;

    setIsSettingRingtone(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to set ringtone.');
        return;
      }

      console.log('🎧 Starting ringtone setup...');
      console.log('📱 Audio source URI:', audioSourceUri);
      console.log('🎵 Audio media details:', audioMedia);

      const localUri = await ensureLocalFile();
      const fileName = localUri.split('/').pop() || localFileName;
      console.log('✅ Local file ready:', localUri);

      // Known gap, deliberately deferred: saveToLibraryAsync (both branches
      // below) has no native dedup - repeated taps create separate,
      // uniquified entries in the OS media library even though localUri
      // above is the same reused cached file each time. Cosmetic only, not
      // a functional or cost issue. Deferred until real user feedback
      // justifies the fix.
      if (Platform.OS === 'android') {
        try {
          // On Android, try to save to media library
          console.log('💾 Attempting to save audio file to media library...');
          await MediaLibrary.saveToLibraryAsync(localUri);
          console.log('✅ Audio saved to media library successfully');

          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Choose the downloaded file',
            [
              {
                text: 'Open Sound Settings',
                onPress: () => {
                  // Try to open Android sound settings
                  // Open device settings
                  Linking.openSettings();
                },
              },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error';
          console.log('⚠️ Could not save to media library, but file is downloaded:', errorMessage);
          // File is still downloaded, just not in media library
          Alert.alert(
            'Ringtone Downloaded',
            'The ringtone has been downloaded to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Look for the ringtone file in your downloads',
            [
              {
                text: 'Open Sound Settings',
                onPress: () => {
                  // Open device settings
                  Linking.openSettings();
                },
              },
              { text: 'OK', style: 'default' },
            ]
          );
        }
      } else if (Platform.OS === 'ios') {
        try {
          // On iOS, try to save to media library (may not work for audio files)
          console.log('💾 Attempting to save audio file to media library (iOS)...');
          await MediaLibrary.saveToLibraryAsync(localUri);
          console.log('✅ Audio saved to media library (iOS)');

          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds & Haptics\n2. Select Ringtone\n3. Choose the downloaded file from "Custom" section',
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error';
          console.log('⚠️ MediaLibrary doesn\'t support this audio format on iOS:', errorMessage);
          // iOS has restrictions on audio files in media library
          Alert.alert(
            'Ringtone Downloaded',
            `The ringtone has been downloaded successfully!\n\nFile location: ${fileName}\n\nFor iOS ringtones:\n• Connect to iTunes/Finder\n• Convert to .m4r format\n• Sync to set as ringtone\n\nOr use GarageBand to import and set as ringtone.`,
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              { text: 'Got It', style: 'default' },
            ]
          );
        }
      }

      // Track the action (optional)
      console.log('✅ Ringtone set for feed:', feed.id);
    } catch (error) {
      console.error('Error setting ringtone:', error);
      Alert.alert('Error', 'Failed to set ringtone. Please try again.');
    } finally {
      setIsSettingRingtone(false);
    }
  };

  // Handle progress bar seeking
  const handleSeek = async (event: any) => {
    if (sound && duration > 0) {
      try {
        const { locationX } = event.nativeEvent;
        const progressBarWidth = width - 80; // Account for card padding
        const percentage = Math.max(0, Math.min(locationX / progressBarWidth, 1));
        const seekPosition = duration * percentage;
        
        await sound.setPositionAsync(seekPosition);
        setPlaybackPosition(seekPosition);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  return (
    <View style={styles.container}>
      {/* Main Layout: Image on left, content on right */}
      <View style={styles.mainLayout}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {audioMedia.thumbnailUrl ? (
            <Image
              source={{ uri: audioMedia.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.defaultThumbnail}>
              <Ionicons
                name="musical-notes"
                size={40}
                color="#C41E3A"
              />
            </View>
          )}
        </View>

        {/* Right Content Area */}
        <View style={styles.rightContent}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {feed.title ? (feed.title[language] || feed.title.en || 'Untitled Ringtone') : 'Untitled Ringtone'}
          </Text>

          {/* Play Controls Row */}
          <View style={styles.playControlsContainer}>
            {/* Play Button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#C41E3A" size="small" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#C41E3A"
                  style={{ marginLeft: isPlaying ? 0 : 2 }}
                />
              )}
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <TouchableOpacity
                style={styles.progressBar}
                onPress={handleSeek}
                activeOpacity={0.8}
              >
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: duration > 0 ? `${(playbackPosition / duration) * 100}%` : '0%' },
                    ]}
                  />
                  {duration > 0 && (
                    <View
                      style={[
                        styles.progressThumb,
                        {
                          left: `${Math.max(0, Math.min((playbackPosition / duration) * 100, 100))}%`,
                        }
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={styles.duration}>
              {formatTime(duration || (audioMedia.duration || 0) * 1000)} sec
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsContainer}>
            {/* Set as Ringtone Button */}
            <TouchableOpacity
              style={styles.ringtoneButton}
              onPress={handleSetRingtone}
              disabled={isSettingRingtone}
              activeOpacity={0.8}
            >
              {isSettingRingtone ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color="#fff"
                />
              )}
              <Text style={styles.ringtoneButtonText}>
                {isSettingRingtone ? 'Setting...' : 'Set as ringtone'}
              </Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons
                name="share-outline"
                size={20}
                color="#C41E3A"
              />
            </TouchableOpacity>

            {/* Like Button */}
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Ionicons
                name={localIsLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={localIsLiked ? '#FF4444' : '#8B7355'}
              />
            </TouchableOpacity>

            {/* Download Button */}
            {feed.allowDownloads && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
                disabled={isDownloading}
                activeOpacity={0.7}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#8B7355" size="small" />
                ) : (
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color="#8B7355"
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E8DDD1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  thumbnailContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 0,
  },
  defaultThumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD1',
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
    color: '#C41E3A',
    lineHeight: 22,
    includeFontPadding: false,
  },
  duration: {
    color: '#8B7355',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  ringtoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C41E3A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  ringtoneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeCount: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 13,
  },
  // Progress Bar Styles
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    marginBottom: 8,
    position: 'relative',
  },
  progressTrack: {
    height: '100%',
    backgroundColor: '#E8DDD1',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C41E3A',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C41E3A',
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },

  // New styles for horizontal layout
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  playControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  progressSection: {
    flex: 1,
    height: 6,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

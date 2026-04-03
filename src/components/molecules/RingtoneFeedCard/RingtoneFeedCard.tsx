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
  Dimensions} from 'react-native';
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

interface RingtoneFeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
}

export default function RingtoneFeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
}: RingtoneFeedCardProps) {
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

  useEffect(() => {
    // Set up audio mode for playback
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error setting up audio mode:', error);
      }
    };

    setupAudio();

    // Cleanup sound when component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

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
            console.log('⏸️ Pausing audio...');
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            console.log('▶️ Resuming audio...');
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
      const audioUri = audioMedia.audioUrl || audioMedia.mediaUrl;
      console.log('🎧 Audio URI:', audioUri);
      console.log('🎼 Audio media:', audioMedia);

      if (audioUri) {
        console.log('📱 Creating new sound instance...');
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );

        console.log('✅ Sound created successfully');
        setSound(newSound);
        setIsPlaying(true);

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
              // Clean up the sound when finished
              newSound.unloadAsync().then(() => {
                setSound(null);
              });
            }
          } else {
            console.log('⚠️ Sound became unloaded');
            setIsPlaying(false);
            setSound(null);
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
        message: feed.caption
          ? `Check out this ringtone: ${feed.caption}\n\nShared from Bhav Bhakti App`
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

      const audioUri = audioMedia.audioUrl || audioMedia.mediaUrl;
      if (!audioUri) return;

      const fileUri = FileSystem.documentDirectory + `ringtone_${feed.id}.mp3`;
      const downloadResult = await FileSystem.downloadAsync(audioUri, fileUri);

      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Success', 'Ringtone saved to your device!');

        await feedService.downloadFeed(feed.id.toString());
        incrementDownload(feed.id.toString());
        onDownload?.(feed.id.toString());
      }
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

      const audioUri = audioMedia.audioUrl || audioMedia.mediaUrl;
      if (!audioUri) return;

      console.log('🎧 Starting ringtone setup...');
      console.log('📱 Audio URI:', audioUri);
      console.log('🎵 Audio media details:', audioMedia);

      // Download the audio file first - try to determine file extension from URL
      const urlParts = audioUri.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';
      const supportedExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
      const fileExtension = supportedExtensions.includes(extension) ? extension : 'mp3';

      const fileName = `ringtone_${feed.id}_${Date.now()}.${fileExtension}`;
      const fileUri = FileSystem.documentDirectory + fileName;
      console.log('🎵 Using file extension:', fileExtension);
      console.log('⬇️ Downloading to:', fileUri);

      const downloadResult = await FileSystem.downloadAsync(audioUri, fileUri);
      console.log('✅ Download completed:', downloadResult);

      if (downloadResult.status === 200) {
        if (Platform.OS === 'android') {
          try {
            // On Android, try to save to media library
            console.log('💾 Attempting to save audio file to media library...');
            await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
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
            await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
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
      }
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
      {/* Thumbnail and Content */}
      <View style={styles.contentContainer}>
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
                size={32}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text variant="h4" style={styles.title} numberOfLines={1}>
            {feed.caption || 'Untitled Ringtone'}
          </Text>

          {/* Duration */}
          <Text variant="caption" style={styles.duration}>
            {formatDuration((audioMedia.duration || duration / 1000) || 0)}
          </Text>

          {/* Tags */}
          {feed.tags && feed.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {feed.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>


      {/* Progress Bar */}
      {(isPlaying || playbackPosition > 0) && (
        <View style={styles.progressContainer}>
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
                      left: `${(playbackPosition / duration) * 100}%`,
                    }
                  ]}
                />
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}
      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Play Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#fff"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          )}
          <Text style={styles.playButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={localIsLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={localIsLiked ? '#FF4444' : goldenTempleTheme.colors.text.secondary}
          />
          {localLikesCount > 0 && (
            <Text style={styles.likeCount}>
              {formatCount(localLikesCount)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Download Button */}
        {feed.allowDownloads && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color={goldenTempleTheme.colors.text.secondary} size="small" />
            ) : (
              <Ionicons
                name="download-outline"
                size={20}
                color={goldenTempleTheme.colors.text.secondary}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Set as Ringtone Button - Android Only */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={styles.ringtoneButton}
            onPress={handleSetRingtone}
            disabled={isSettingRingtone}
          >
            {isSettingRingtone ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name="call"
                size={18}
                color="#fff"
              />
            )}
            <Text style={styles.ringtoneButtonText}>
              {isSettingRingtone ? 'Setting...' : 'Set Ringtone'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons
            name="share-outline"
            size={20}
            color={goldenTempleTheme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 0,
    ...goldenTempleTheme.shadows.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  thumbnailContainer: {
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 0,
  },
  defaultThumbnail: {
    width: 72,
    height: 72,
    backgroundColor: '#FF5722', // Orange thumbnail,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 6,
    color: '#1A1A1A',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  duration: {
    color: '#8E8E93',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '500',
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
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722', // Orange play button,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 90,
    justifyContent: 'center',
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
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 0,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 110,
    justifyContent: 'center',
  },
  ringtoneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 5,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 65,
    justifyContent: 'center',
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
    backgroundColor: '#F5E6D3', // Light peach track
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5722', // Orange fill
    borderRadius: 4,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5722',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
});

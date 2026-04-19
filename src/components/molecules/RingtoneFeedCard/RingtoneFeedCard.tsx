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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path } from 'react-native-svg';
import { SvgUri } from 'react-native-svg';

const { width } = Dimensions.get('window');
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';
import RingtonePlayer from '../RingtonePlayer/RingtonePlayer';

// Shared HeartIcon — same as FeedCard
const HeartIcon = ({ width: w, height: h, fill, stroke, strokeWidth }: {
  width: number; height: number; fill: string; stroke: string; strokeWidth: number;
}) => (
  <Svg width={w} height={h} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);


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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSettingRingtone, setIsSettingRingtone] = useState(false);
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
  const { language } = useTranslation();

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
  }, []);

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
    // Seeking functionality removed - handled by individual RingtonePlayer
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
            {feed.caption || 'Untitled Ringtone'}
          </Text>

          {/* Play Controls Row */}
          <View style={styles.playControlsContainer}>
            {/* Play Button */}
            <RingtonePlayer
              feedId={feed.id.toString()}
              audioUri={audioMedia.audioUrl || audioMedia.mediaUrl}
              onViewTrack={() => {
                feedService.viewFeed(feed.id.toString());
                incrementView(feed.id.toString());
              }}
            />

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

          {/* Action Buttons Row — 2 buttons only */}
          <View style={styles.actionsContainer}>
            {/* Set as Ringtone — gradient, i18n */}
            <TouchableOpacity
              style={styles.ringtoneButtonContainer}
              onPress={handleSetRingtone}
              disabled={isSettingRingtone}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#E76A4A', '#CA3500']}
                style={styles.ringtoneButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                {isSettingRingtone ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="notifications-outline" size={14} color="#fff" />
                )}
                <Text style={styles.ringtoneButtonText}>
                  {isSettingRingtone
                    ? (language === 'hi' ? 'सेट हो रहा है...' : 'Setting...')
                    : (language === 'hi' ? 'रिंगटोन के रूप में सेट करें' : 'Set as ringtone')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Share — secondary style, i18n */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="paper-plane" size={14} color="#E76A4A" />
              <Text style={styles.shareButtonText}>
                {language === 'hi' ? 'साझा करें' : 'Share'}
              </Text>
            </TouchableOpacity>

            {/* Like — commented out */}
            {/* <TouchableOpacity
              style={[styles.actionButton, localIsLiked && styles.actionButtonLiked]}
              onPress={handleLike} activeOpacity={0.7}
            >
              <HeartIcon width={24} height={24}
                fill={localIsLiked ? '#E76A4A' : 'none'}
                stroke="#E76A4A" strokeWidth={localIsLiked ? 0 : 2}
              />
            </TouchableOpacity> */}

            {/* Download — commented out */}
            {/* {feed.allowDownloads && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownload} disabled={isDownloading}>
                {isDownloading ? <ActivityIndicator color="#8B7355" size="small" />
                  : <Ionicons name="download-outline" size={20} color="#8B7355" />}
              </TouchableOpacity>
            )} */}
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
    gap: 8,
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
  // Ringtone button — gradient container + inner styles
  ringtoneButtonContainer: {
    flex: 2, // Make it wider (2/3 of available space)
    borderRadius: 6,
    overflow: 'hidden',
  },
  ringtoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  ringtoneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Share button — secondary style (i18n, icon + text)
  shareButton: {
    flex: 1, // Make it smaller (1/3 of available space)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5E0C0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
  },
  shareButtonText: {
    color: '#E76A4A',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.2,
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

  // Horizontal layout
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
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


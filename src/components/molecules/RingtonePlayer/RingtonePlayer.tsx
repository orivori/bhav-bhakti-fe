import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

// Simple global Map to track active ringtone sounds by feedId
const activeRingtoneSounds = new Map<string, Audio.Sound>();

// Global function to stop all ringtones except one
const stopAllRingtonesExcept = async (exceptFeedId?: string) => {
  console.log('🛑 Stopping ALL ringtones except:', exceptFeedId);
  const soundsToStop: Promise<void>[] = [];

  for (const [feedId, sound] of activeRingtoneSounds.entries()) {
    if (feedId !== exceptFeedId) {
      console.log('🛑 Stopping ringtone sound for feed:', feedId);
      soundsToStop.push(
        sound.unloadAsync().catch(err => console.log('Error stopping sound:', err))
      );
      activeRingtoneSounds.delete(feedId);
    }
  }

  if (soundsToStop.length > 0) {
    await Promise.all(soundsToStop);
    console.log('✅ Stopped', soundsToStop.length, 'ringtone sounds');
  }
};

interface RingtonePlayerProps {
  feedId: string;
  audioUri: string;
  onViewTrack?: () => void;
}

const RingtonePlayer: React.FC<RingtonePlayerProps> = ({ feedId, audioUri, onViewTrack }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const stopAudio = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        // Remove from global map
        activeRingtoneSounds.delete(feedId);
        console.log('🛑 Stopped and removed ringtone for feed:', feedId);
      } catch (error) {
        console.log('Error stopping ringtone:', error);
      }
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Cleanup ringtone player for feed:', feedId);
      stopAudio();
    };
  }, []);

  const handlePlayPause = async () => {
    console.log('🎵 Ringtone play/pause for feed:', feedId, 'isPlaying:', isPlaying);

    try {
      if (sound) {
        // If we have a sound, pause/resume it
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            console.log('⏸️ Pausing ringtone...');
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            console.log('▶️ Resuming ringtone for feed:', feedId);
            // CRITICAL: Stop all other ringtones before resuming this one
            await stopAllRingtonesExcept(feedId);
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        } else {
          // Sound not loaded, clean up
          setSound(null);
          setIsPlaying(false);
        }
      }

      if (!audioUri) {
        console.error('❌ No audio URI provided');
        return;
      }

      setIsLoading(true);

      // CRITICAL: Stop all other ringtones first before starting new one
      await stopAllRingtonesExcept(feedId);

      console.log('🎧 Creating new ringtone sound for feed:', feedId);

      // Create new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Register this sound in global map
      activeRingtoneSounds.set(feedId, newSound);
      console.log('✅ Ringtone started and registered for feed:', feedId);

      // Track view if callback provided
      if (onViewTrack) {
        onViewTrack();
      }

      // Set up playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying || false);

          if (status.didJustFinish) {
            console.log('🏁 Ringtone finished for feed:', feedId);
            setIsPlaying(false);
            setSound(null);
            // Remove from global map
            activeRingtoneSounds.delete(feedId);
            newSound.unloadAsync().catch(console.error);
          }
        } else {
          console.log('⚠️ Ringtone became unloaded for feed:', feedId);
          setIsPlaying(false);
          setSound(null);
          // Remove from global map
          activeRingtoneSounds.delete(feedId);
        }
      });

    } catch (error) {
      console.error('❌ Error with ringtone for feed:', feedId, error);
      setIsPlaying(false);
      setSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};

const styles = StyleSheet.create({
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RingtonePlayer;
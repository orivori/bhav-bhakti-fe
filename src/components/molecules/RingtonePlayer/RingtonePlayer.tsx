import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Text } from '@/components/atoms';

// Global Audio Session Manager (shared across the app)
declare global {
  var globalAudioSessionManager: {
    currentSound: Audio.Sound | null;
    currentScreen: string | null;
    activeRingtones: Map<string, Audio.Sound>;
    stopCurrentAudio: (newScreen?: string) => Promise<void>;
    stopAllRingtones: (exceptFeedId?: string) => Promise<void>;
    setCurrentSound: (sound: Audio.Sound, screen: string) => void;
  } | undefined;
}

// Initialize global audio session manager if not exists
if (!global.globalAudioSessionManager) {
  global.globalAudioSessionManager = {
    currentSound: null,
    currentScreen: null,
    activeRingtones: new Map<string, Audio.Sound>(),

    async stopCurrentAudio(newScreen?: string) {
      // Stop main audio (mantras)
      if (this.currentSound) {
        try {
          const status = await this.currentSound.getStatusAsync();
          if (status.isLoaded) {
            await this.currentSound.stopAsync();
            await this.currentSound.unloadAsync();
            console.log(`🛑 Stopped main audio from ${this.currentScreen || 'unknown screen'}`);
          }
        } catch (error) {
          console.log('⚠️ Error stopping main audio:', error);
        }
        this.currentSound = null;
      }

      // Stop all ringtones
      await this.stopAllRingtones();

      if (newScreen) {
        this.currentScreen = newScreen;
      }
    },

    async stopAllRingtones(exceptFeedId?: string) {
      console.log('🛑 Stopping ALL ringtones except:', exceptFeedId);
      const soundsToStop: Promise<void>[] = [];

      for (const [feedId, sound] of this.activeRingtones.entries()) {
        if (feedId !== exceptFeedId) {
          console.log('🛑 Stopping ringtone sound for feed:', feedId);
          soundsToStop.push(
            sound.unloadAsync().catch(err => console.log('Error stopping sound:', err))
          );
          this.activeRingtones.delete(feedId);
        }
      }

      if (soundsToStop.length > 0) {
        await Promise.all(soundsToStop);
        console.log('✅ Stopped', soundsToStop.length, 'ringtone sounds');
      }
    },

    setCurrentSound(sound: Audio.Sound, screen: string) {
      this.currentSound = sound;
      this.currentScreen = screen;
    }
  };
}

const globalManager = global.globalAudioSessionManager;

interface RingtonePlayerProps {
  feedId: string;
  audioUri: string;
  onViewTrack?: () => void;
  showProgressBar?: boolean;
}

const RingtonePlayer: React.FC<RingtonePlayerProps> = ({ feedId, audioUri, onViewTrack, showProgressBar = false }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const stopAudio = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        // Remove from global map
        globalManager.activeRingtones.delete(feedId);
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
            // CRITICAL: Stop all other audio (including mantras) before resuming this one
            await globalManager.stopCurrentAudio('ringtone');
            await globalManager.stopAllRingtones(feedId);
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

      // CRITICAL: Stop all other audio (including mantras) before starting new ringtone
      await globalManager.stopCurrentAudio('ringtone');
      await globalManager.stopAllRingtones(feedId);

      console.log('🎧 Creating new ringtone sound for feed:', feedId);

      // Create new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Register this sound in global map
      globalManager.activeRingtones.set(feedId, newSound);
      console.log('✅ Ringtone started and registered for feed:', feedId);

      // Track view if callback provided
      if (onViewTrack) {
        onViewTrack();
      }

      // Set up playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying || false);
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            console.log('🏁 Ringtone finished for feed:', feedId);
            setIsPlaying(false);
            setSound(null);
            setPosition(0);
            // Remove from global map
            globalManager.activeRingtones.delete(feedId);
            newSound.unloadAsync().catch(console.error);
          }
        } else {
          console.log('⚠️ Ringtone became unloaded for feed:', feedId);
          setIsPlaying(false);
          setSound(null);
          setPosition(0);
          // Remove from global map
          globalManager.activeRingtones.delete(feedId);
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

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = async (percentage: number) => {
    if (sound && duration > 0) {
      try {
        const seekPosition = duration * percentage;
        await sound.setPositionAsync(seekPosition);
        setPosition(seekPosition);
      } catch (error) {
        console.log('Error seeking:', error);
      }
    }
  };

  if (showProgressBar) {
    return (
      <View style={styles.fullPlayerContainer}>
        {/* Play/Pause Button with Progress Bar */}
        <View style={styles.playProgressContainer}>
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

          {/* Progress Bar aligned with play button */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
              ]}
            />
            <TouchableOpacity
              style={styles.progressBarTouch}
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                const progressBarWidth = 150; // Approximate width, adjust as needed
                const percentage = locationX / progressBarWidth;
                handleSeek(Math.max(0, Math.min(1, percentage)));
              }}
              activeOpacity={1}
            />
          </View>
        </View>

        {/* Time Display */}
        <Text style={styles.timeText}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>
    );
  }

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
  fullPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  playProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
    flex: 1,
    minWidth: 100,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#C41E3A',
    borderRadius: 2,
  },
  progressBarTouch: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
  },
});

export default RingtonePlayer;
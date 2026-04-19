import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  ScrollView,
  PanResponder,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { Feed } from '@/types/feed';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { SpeedMeter } from '@/components/icons/SpeedMeter';
import { useLanguageStore } from '@/store/languageStore';

const { width } = Dimensions.get('window');

// Target count options for mantras
const TARGET_COUNT_OPTIONS = [27, 54, 108, 216, 324, 540, 1008];

export default function AudioPlayerScreen() {
  const params = useLocalSearchParams();
  const feedId = params.feedId?.toString();
  const { t } = useTranslation();
  const { contentPadding } = useTabBarHeight();
  const navigation = useNavigation();
  const { language } = useLanguageStore();

  // UI state
  const [activeTab, setActiveTab] = useState<'mantra' | 'lyrics'>('mantra');
  const [showEditProgress, setShowEditProgress] = useState(false);

  // Feed data state
  const [feedData, setFeedData] = useState<Feed | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Counter state
  const [chantCount, setChantCount] = useState(0);
  const [targetCount, setTargetCount] = useState(108);
  const [showTargetSelector, setShowTargetSelector] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isAutoLooping, setIsAutoLooping] = useState(false); // Auto-loop until target reached
  const soundRef = React.useRef<Audio.Sound | null>(null); // Ref to maintain current sound instance

  // Refs to store current state values for callback access (fixes stale closure issue)
  const isAutoLoopingRef = React.useRef(isAutoLooping);
  const chantCountRef = React.useRef(chantCount);
  const targetCountRef = React.useRef(targetCount);
  const feedIdRef = React.useRef(feedId);

  // Animation values
  const pulseAnim = new Animated.Value(1);
  const rotateAnim = new Animated.Value(0);
  const waveAnims = [...Array(20)].map(() => new Animated.Value(1));

  // Interpolate rotation for proper string format
  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Counter storage key
  const getCounterKey = (feedId: string) => `mantra_counter_${feedId}`;
  const getTargetKey = (feedId: string) => `mantra_target_${feedId}`;

  // Load saved counter progress
  const loadCounterProgress = async (feedId: string) => {
    try {
      const [savedCount, savedTarget] = await Promise.all([
        AsyncStorage.getItem(getCounterKey(feedId)),
        AsyncStorage.getItem(getTargetKey(feedId)),
      ]);

      if (savedCount) {
        setChantCount(parseInt(savedCount, 10));
      }
      if (savedTarget) {
        setTargetCount(parseInt(savedTarget, 10));
      }
    } catch (error) {
      console.error('Error loading counter progress:', error);
    }
  };

  // Save counter progress
  const saveCounterProgress = async (feedId: string, count: number, target: number) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(getCounterKey(feedId), count.toString()),
        AsyncStorage.setItem(getTargetKey(feedId), target.toString()),
      ]);
    } catch (error) {
      console.error('Error saving counter progress:', error);
    }
  };

  // Fetch feed data from API
  const fetchFeedData = async () => {
    if (!feedId) {
      console.log('❌ Audio Player: No feed ID provided');
      setFeedError('No feed ID provided');
      setIsFeedLoading(false);
      return;
    }

    try {
      console.log('🔄 Audio Player: Fetching feed data for ID:', feedId);
      setIsFeedLoading(true);
      setFeedError(null);

      const feed = await feedService.getFeedById(feedId, language);
      console.log('✅ Audio Player: Feed data received:', feed);

      setFeedData(feed);

      // Load saved progress for this mantra
      await loadCounterProgress(feedId);

      // Track view
      await feedService.viewFeed(feedId);
      console.log('👁️ Audio Player: View tracked for feed:', feedId);
    } catch (error) {
      console.error('❌ Audio Player: Error fetching feed:', error);
      setFeedError('Failed to load mantra details');
    } finally {
      setIsFeedLoading(false);
    }
  };

  // Helper function to get localized text from JSON field
  const getLocalizedText = (jsonField: any, fallback: string): string => {
    if (!jsonField) return fallback;

    if (typeof jsonField === 'string') return jsonField;

    if (typeof jsonField === 'object' && !Array.isArray(jsonField)) {
      const keys = Object.keys(jsonField);
      if (keys.length === 0) return fallback;

      // Try current language first, then English, then Hindi, then first available
      return jsonField['en'] || jsonField['hi'] || Object.values(jsonField)[0] || fallback;
    }

    return fallback;
  };

  // Get mantra data from feed or fallback to params
  const getMantraData = () => {
    if (feedData && feedData.media && Array.isArray(feedData.media)) {
      const audioMedia = feedData.media.find(media =>
        media.type === 'audio' || media.type === 'image_audio'
      );

      // Get deity name from the deity relationship or fallback
      const deityName = feedData.deity?.displayName
        ? getLocalizedText(feedData.deity.displayName, feedData.deity.name || t('unknownDeity'))
        : t('unknownDeity');

      // Get description from feed's multilingual description field
      const description = getLocalizedText(feedData.description, t('mantraDescription'));

      // Get objective from feed's multilingual objective field
      const objective = getLocalizedText(feedData.objective, t('spiritualGrowth'));

      return {
        title: getLocalizedText(feedData.title, feedData.caption || t('sacredMantra')),
        description,
        tags: feedData.tags,
        deity: deityName,
        objective,
        audioUrl: audioMedia?.mediaUrl || audioMedia?.audioUrl,
        thumbnailUrl: audioMedia?.thumbnailUrl,
        feedId: feedData.id.toString(),
      };
    }

    // Fallback to params if feed data not loaded
    return {
      title: params.title || t('sacredMantra'),
      description: params.description || t('mantraDescription'),
      tags: params.tags ? params.tags.toString().split(',') : [t('mantras')],
      deity: params.deity || t('unknownDeity'),
      objective: params.objective || t('spiritualGrowth'),
      audioUrl: params.audioUrl,
      thumbnailUrl: params.thumbnailUrl,
      feedId: params.feedId,
    };
  };

  const mantraData = getMantraData();

  // Update refs whenever state changes to avoid stale closure issues
  useEffect(() => {
    isAutoLoopingRef.current = isAutoLooping;
    console.log('🔄 Updated isAutoLoopingRef to:', isAutoLooping);
  }, [isAutoLooping]);

  useEffect(() => {
    chantCountRef.current = chantCount;
    console.log('🔢 Updated chantCountRef to:', chantCount);
  }, [chantCount]);

  useEffect(() => {
    targetCountRef.current = targetCount;
    console.log('🎯 Updated targetCountRef to:', targetCount);
  }, [targetCount]);

  useEffect(() => {
    feedIdRef.current = feedId;
  }, [feedId]);

  // Keep soundRef in sync with sound state
  useEffect(() => {
    soundRef.current = sound;
    console.log('🔧 Updated soundRef to match sound state:', !!sound);
  }, [sound]);

  // Track previous feedId to detect actual changes
  const prevFeedIdRef = React.useRef<string | undefined>(feedId);

  // Fetch feed data on component mount and reset audio when feedId changes
  useEffect(() => {
    const currentFeedId = feedId;
    const previousFeedId = prevFeedIdRef.current;

    console.log('🔍 FeedId effect triggered - Current:', currentFeedId, 'Previous:', previousFeedId);

    // Update the ref for next time
    prevFeedIdRef.current = currentFeedId;

    // Only cleanup if feedId actually changed and we have existing audio
    if (sound && currentFeedId && previousFeedId && currentFeedId !== previousFeedId) {
      console.log('🔄 FeedId ACTUALLY changed - cleaning up previous audio');

      // Completely safe cleanup - never throws errors
      const ultraSafeCleanup = async () => {
        try {
          // Double check sound still exists
          if (!sound) {
            console.log('⚠️ Sound object became null during cleanup');
            resetAudioStates();
            fetchFeedData();
            return;
          }

          // Try to get status first
          let status;
          try {
            status = await sound.getStatusAsync();
          } catch (statusError: any) {
            console.log('⚠️ Cannot get audio status:', statusError?.message || 'Unknown error');
            resetAudioStates();
            fetchFeedData();
            return;
          }

          // If loaded, try to stop
          if (status.isLoaded) {
            console.log('🔄 Stopping loaded audio for new mantra');
            try {
              await sound.stopAsync();
              console.log('✅ Audio stopped successfully');
            } catch (stopError: any) {
              console.log('⚠️ Stop failed, but continuing:', stopError?.message || 'Unknown error');
            }
          }

          // Always try to unload
          console.log('🔄 Unloading audio for new mantra');
          try {
            await sound.unloadAsync();
            console.log('✅ Audio unloaded successfully');
          } catch (unloadError: any) {
            console.log('⚠️ Unload failed:', unloadError?.message || 'Unknown error');
          }

        } catch (error: any) {
          console.log('⚠️ Unexpected error during cleanup:', error?.message || 'Unknown error');
        } finally {
          // Always reset states and continue
          resetAudioStates();
          fetchFeedData();
        }
      };

      ultraSafeCleanup();
    } else {
      // No existing audio or feedId didn't change, just fetch data normally
      console.log('📁 Fetching feed data without cleanup');
      fetchFeedData();
    }
  }, [feedId]);

  // Listen for navigation events to stop audio when user navigates away
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Screen lost focus (user navigated to another screen)
      console.log('📱 Navigation: Screen blurred - stopping audio playback');

      if (sound && isPlaying) {
        // Safe audio pause with error handling
        const safePause = async () => {
          try {
            const status = await sound.getStatusAsync();

            if (status.isLoaded && status.isPlaying) {
              await sound.pauseAsync();
              console.log('⏸️ Audio paused due to navigation away');
            } else {
              console.log('⚠️ Audio not playing - just updating states');
            }
          } catch (error: any) {
            console.log('⚠️ Error pausing on blur:', error?.message || 'Unknown error');
          } finally {
            // Always update UI states
            setIsPlaying(false);
            setIsAutoLooping(false);
          }
        };

        safePause();
      } else {
        // No sound or not playing, just update states
        setIsPlaying(false);
        setIsAutoLooping(false);
      }
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      // Screen gained focus (user came back to this screen)
      console.log('📱 Navigation: Screen focused - audio player ready');
    });

    // Cleanup listeners
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation, sound, isPlaying]);

  // Cleanup audio when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Cleanup function runs when component unmounts (user goes back or navigates to another screen)
      if (sound) {
        console.log('🧹 Audio Player: Component unmounting - cleaning up audio');

        // Fire and forget cleanup - don't wait for it
        const cleanup = async () => {
          try {
            const status = await sound.getStatusAsync();

            if (status.isLoaded) {
              console.log('🧹 Stopping and unloading audio on unmount');
              try {
                await sound.stopAsync();
              } catch (stopError: any) {
                console.log('⚠️ Stop failed on unmount:', stopError?.message || 'Unknown error');
              }
            }

            try {
              await sound.unloadAsync();
              console.log('✅ Audio unloaded on unmount');
            } catch (unloadError: any) {
              console.log('⚠️ Unload failed on unmount:', unloadError?.message || 'Unknown error');
            }

          } catch (error: any) {
            console.log('⚠️ Cleanup error on unmount:', error?.message || 'Unknown error');
            // Try silent unload as last resort
            try {
              await sound.unloadAsync();
            } catch (finalError) {
              // Silent fail - component is unmounting anyway
            }
          }
        };

        cleanup(); // Fire and forget
      }

      // Clear any ongoing volume change timeouts
      if (volumeChangeTimeout.current) {
        clearTimeout(volumeChangeTimeout.current);
        volumeChangeTimeout.current = null;
      }

      console.log('🔄 Audio Player cleanup initiated');
    };
  }, [sound]);


  // Test animation on mount to see if bars can animate at all
  useEffect(() => {
    console.log('🧪 Testing wave bar animation...');

    // Test first 3 bars with simple animation
    waveAnims.slice(0, 3).forEach((anim, index) => {
      setTimeout(() => {
        console.log(`🧪 Testing bar ${index}`);

        const testAnimation = () => {
          Animated.timing(anim, {
            toValue: index === 0 ? 1.5 : index === 1 ? 0.5 : 1.8,
            duration: 1000,
            useNativeDriver: false,
          }).start(() => {
            Animated.timing(anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }).start();
          });
        };

        testAnimation();
      }, index * 500);
    });
  }, []);

  // Wave animation effect - responds to play/pause
  useEffect(() => {
    console.log('🌊 Wave Effect: isPlaying changed to', isPlaying);

    if (isPlaying) {
      // Start wave animations
      startWaveAnimations();
    } else {
      // Stop wave animations
      stopWaveAnimations();
    }

    // Cleanup function
    return () => {
      stopWaveAnimations();
    };
  }, [isPlaying]);

  const startWaveAnimations = () => {
    console.log('🌊 Starting wave animations...');

    waveAnims.forEach((anim, index) => {
      // Set initial random value
      anim.setValue(0.5 + Math.random() * 0.8);

      const animateBar = () => {
        if (!isPlaying) return;

        Animated.timing(anim, {
          toValue: 0.3 + Math.random() * 1.2, // Random between 0.3 and 1.5
          duration: 400 + Math.random() * 300,
          useNativeDriver: false,
        }).start(() => {
          // Continue animating if still playing
          if (isPlaying) {
            setTimeout(animateBar, 50); // Small delay between animations
          }
        });
      };

      // Start each bar with delay for wave effect
      setTimeout(() => {
        console.log(`🌊 Bar ${index} starting animation`);
        animateBar();
      }, index * 30);
    });
  };

  const stopWaveAnimations = () => {
    console.log('🌊 Stopping wave animations...');

    // Reset all bars to normal size immediately
    waveAnims.forEach(anim => {
      anim.stopAnimation();
      anim.setValue(1); // Reset to normal height
    });
  };

  // Initialize audio session
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🔊 Audio Player: Setting up audio session...');

        // Set audio mode to allow playback even when device is on silent
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,  // This is key for iOS
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
        });

        console.log('✅ Audio Player: Audio session configured');
      } catch (error) {
        console.error('❌ Audio Player: Failed to set audio mode:', error);
      }
    };

    initializeAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      // soundRef will be cleared by useEffect when sound becomes null
    };
  }, [sound]);

  // Animations
  useEffect(() => {
    // Pulse animation for play button
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isPlaying) pulse();
      });
    };

    // Spin animation for loading
    const spin = () => {
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isAudioLoading) spin();
      });
    };



    console.log('🎵 Animation Effect: isPlaying =', isPlaying, 'isAudioLoading =', isAudioLoading);

    if (isPlaying) {
      pulse();
    } else {
      pulseAnim.setValue(1);
    }

    if (isAudioLoading) {
      spin();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isPlaying, isAudioLoading]);

  // Handle audio playback
  const togglePlayback = async () => {
    try {
      if (sound) {
        // Check if sound is properly loaded
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          console.log('⚠️ Audio Player: Sound exists but not loaded, recreating...');
          await sound.unloadAsync();
          setSound(null);
          // soundRef will be cleared by useEffect
          setIsPlaying(false);
          // Fall through to create new sound
        } else {
          if (isPlaying) {
            console.log('⏸️ Pausing audio - stopping auto-loop');
            await sound.pauseAsync();
            setIsPlaying(false);
            setIsAutoLooping(false); // Stop auto-loop when user pauses
          } else {
            console.log('▶️ Resuming audio');

            // Check if we should restart auto-looping
            const shouldAutoLoop = chantCount < targetCount && !isLooping;
            if (shouldAutoLoop) {
              setIsAutoLooping(true);
              await sound.setIsLoopingAsync(false); // Don't use built-in loop for auto-loop
              console.log('🔄 Resuming with auto-loop - Count:', chantCount, 'Target:', targetCount);
            } else {
              setIsAutoLooping(false);
              await sound.setIsLoopingAsync(isLooping); // Use manual loop setting
            }

            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      if (mantraData.audioUrl) {
        console.log('🎵 Audio Player: Attempting to load audio from URL:', mantraData.audioUrl);

        // Test URL accessibility first
        try {
            const response = await fetch(mantraData.audioUrl?.toString() || '', { method: 'HEAD' });

          if (!response.ok) {
            throw new Error(`URL not accessible: ${response.status} ${response.statusText}`);
          }
        } catch (urlError) {
          console.error('❌ Audio Player: URL accessibility test failed:', urlError);
          Alert.alert(
            t('audioNotAvailableTitle'),
            t('audioConnectionError')
          );
          return;
        }

        setIsAudioLoading(true);

        // Determine if we should auto-loop (when count < target)
        const shouldAutoLoop = chantCount < targetCount;
        setIsAutoLooping(shouldAutoLoop);

        console.log('🎵 Audio setup - Count:', chantCount, 'Target:', targetCount, 'Auto-loop:', shouldAutoLoop);

        // Create the sound with initial configuration
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: mantraData.audioUrl?.toString() || '' },
          {
            shouldPlay: false, // Don't auto-play, let user control
            isLooping: isLooping && !shouldAutoLoop, // Only use audio loop for manual loop, not auto-loop
            volume: volume,
            rate: playbackSpeed,
            shouldCorrectPitch: false,
          }
        );

        // Debug volume settings
        const initialStatus = await newSound.getStatusAsync();
        console.log('🔊 Audio Player: Initial audio status:', {
          isLoaded: initialStatus.isLoaded,
          volume: initialStatus.isLoaded ? initialStatus.volume : 'N/A',
          isMuted: initialStatus.isLoaded ? initialStatus.isMuted : 'N/A'
        });

        // Wait for the sound to be properly loaded with timeout
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds maximum wait time

          const checkStatus = async () => {
            try {
              attempts++;
              const status = await newSound.getStatusAsync();

              if (status.isLoaded) {
                console.log('✅ Audio Player: Audio loaded successfully');
                setSound(newSound);
                // soundRef will be updated by useEffect

                // Set volume to current volume setting
                try {
                  await newSound.setVolumeAsync(volume);
                  console.log('🔊 Audio Player: Volume set to', volume);
                } catch (volumeError) {
                  console.error('⚠️ Audio Player: Failed to set initial volume:', volumeError);
                  // Continue without failing the audio load
                }

                // Now start playing
                console.log('▶️ Audio Player: Starting playback...');
                const playResult = await newSound.playAsync();
                console.log('▶️ Audio Player: playAsync() result:', playResult);

                // Wait a moment for playback to actually start
                await new Promise(resolve => setTimeout(resolve, 100));

                // Double-check playback status
                const playStatus = await newSound.getStatusAsync();
                console.log('🔊 Audio Player: Playback status after playAsync():', {
                  isLoaded: playStatus.isLoaded,
                  isPlaying: playStatus.isLoaded ? playStatus.isPlaying : 'N/A',
                  volume: playStatus.isLoaded ? playStatus.volume : 'N/A',
                  positionMillis: playStatus.isLoaded ? playStatus.positionMillis : 'N/A',
                  durationMillis: playStatus.isLoaded ? playStatus.durationMillis : 'N/A',
                  shouldPlay: playStatus.isLoaded ? playStatus.shouldPlay : 'N/A'
                });

                // If playback didn't start, try different approaches
                if (playStatus.isLoaded && !playStatus.isPlaying) {
                  console.log('⚠️ Audio Player: Playback not started, trying alternative method...');

                  // Try method 1: Stop and restart
                  try {
                    await newSound.stopAsync();
                    await newSound.setPositionAsync(0);
                    await newSound.playAsync();

                    await new Promise(resolve => setTimeout(resolve, 100));
                    const retryStatus1 = await newSound.getStatusAsync();
                    console.log('🔄 Audio Player: Method 1 retry status:', {
                      isPlaying: retryStatus1.isLoaded ? retryStatus1.isPlaying : 'N/A'
                    });

                    if (!retryStatus1.isLoaded || !retryStatus1.isPlaying) {
                      // Try method 2: Recreate with shouldPlay: true
                      console.log('🔄 Audio Player: Method 2 - recreating with shouldPlay: true');
                      await newSound.unloadAsync();

                      const { sound: retrySound } = await Audio.Sound.createAsync(
                        { uri: mantraData.audioUrl?.toString() || '' },
                        { shouldPlay: true, volume: 1.0 }
                      );

                      setSound(retrySound);
                      // soundRef will be updated by useEffect
                      setIsPlaying(true);
                      resolve(status);
                      return;
                    }
                  } catch (retryError) {
                    console.error('❌ Audio Player: Retry methods failed:', retryError);
                  }
                }

                setIsPlaying(playStatus.isLoaded ? playStatus.isPlaying : false);
                resolve(status);
              } else if (attempts >= maxAttempts) {
                reject(new Error('Audio loading timeout - took too long to load'));
              } else {
                console.log(`⏳ Audio Player: Still loading... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkStatus, 100); // Check again in 100ms
              }
            } catch (error) {
              reject(error);
            }
          };
          checkStatus();
        });

        // Set up playback status listener
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            // Only update position if not actively seeking
            if (!isSeeking) {
              setPosition(status.positionMillis || 0);
            }

            if (status.didJustFinish) {
              console.log('🎵 Audio Player: Audio playback finished');
              console.log('🔄 Current states:');
              console.log('   - Count:', chantCount, '/ Target:', targetCount);
              console.log('   - Auto-looping:', isAutoLooping);
              console.log('   - Manual looping:', isLooping);
              console.log('   - Is playing:', isPlaying);
              console.log('   - Sound ref exists:', !!soundRef.current);

              // Use ref values to get current state (avoiding stale closure)
              const currentAutoLooping = isAutoLoopingRef.current;
              const currentCount = chantCountRef.current;
              const currentTarget = targetCountRef.current;
              const currentFeedId = feedIdRef.current;

              console.log('🔄 Using ref values:');
              console.log('   - Auto-looping ref:', currentAutoLooping);
              console.log('   - Count ref:', currentCount);
              console.log('   - Target ref:', currentTarget);

              if (currentAutoLooping && currentCount < currentTarget) {
                // Auto-increment counter and restart audio if target not reached
                console.log('🔄 Auto-looping active - processing song finish...');
                console.log('🔄 Sound ref available:', !!soundRef.current);

                // Calculate new count
                const newCount = currentCount + 1;
                console.log('🔄 Incrementing count from', currentCount, 'to', newCount);

                // Update counter state immediately
                setChantCount(newCount);

                // Save progress
                if (currentFeedId) {
                  saveCounterProgress(currentFeedId, newCount, currentTarget).catch(console.error);
                }

                // Check if target reached
                if (newCount >= currentTarget) {
                  console.log('🎯 Target reached! Stopping auto-loop');
                  setIsAutoLooping(false);
                  setIsPlaying(false);

                  // Show celebration
                  setTimeout(() => {
                    Alert.alert(
                      t('congratulations'),
                      t('mantraChantCompleted').replace('{count}', currentTarget.toString()),
                      [
                        { text: t('continue'), style: 'default' },
                        { text: t('resetCounter'), onPress: handleResetCounter, style: 'destructive' },
                      ]
                    );
                  }, 500);
                } else {
                  // Continue auto-loop: restart audio immediately
                  console.log('🔄 Target not reached, restarting audio for repetition', newCount);

                  let currentSound = soundRef.current;

                  console.log('🔍 Debug sound references:');
                  console.log('   - soundRef.current exists:', !!soundRef.current);
                  console.log('   - sound state exists:', !!sound);

                  // If soundRef is null but sound state exists, update the ref
                  if (!currentSound && sound) {
                    console.log('🔧 Updating soundRef from sound state');
                    soundRef.current = sound;
                    currentSound = sound;
                  }

                  if (!currentSound) {
                    console.error('❌ No sound reference available for restart');
                    console.error('❌ Sound might have been unloaded - stopping auto-loop');
                    setIsPlaying(false);
                    setIsAutoLooping(false);
                    return;
                  }

                  // Restart audio immediately
                  (async () => {
                    try {
                      console.log('🔄 Attempting immediate audio restart...');

                      // Reset to beginning and play
                      await currentSound.setPositionAsync(0);
                      setPosition(0);
                      await currentSound.playAsync();

                      console.log('✅ Audio restarted successfully for repetition', newCount);

                    } catch (error) {
                      console.error('❌ Restart failed, trying alternative method:', error);

                      try {
                        await currentSound.stopAsync();
                        await currentSound.setPositionAsync(0);
                        await currentSound.playAsync();
                        console.log('✅ Audio restarted with alternative method');

                      } catch (error2) {
                        console.error('❌ Alternative restart failed, recreating sound:', error2);
                        try {
                          await togglePlayback(); // Recreate sound as last resort
                          console.log('✅ Sound recreated for auto-loop continuation');
                        } catch (error3) {
                          console.error('❌ All methods failed:', error3);
                          setIsPlaying(false);
                          setIsAutoLooping(false);
                        }
                      }
                    }
                  })();
                }
              } else {
                // Not auto-looping or target reached
                console.log('⏹️ Not auto-looping or target reached - stopping playback');
                setIsPlaying(false);
                setPosition(0);

                // Manual increment if not looping and count < target
                if (!isLooping && currentCount < currentTarget) {
                  console.log('📈 Manual increment after song finish');
                  handleIncrementCount();
                }
              }
            }
          } else if (status.error) {
            console.error('🎵 Audio Player: Playback status error:', status.error);
          }
        });
      } else {
        console.log('❌ Audio Player: No audio URL provided');
        Alert.alert(t('audioPlaybackError'), t('noAudioUrlError'));
      }
    } catch (error: any) {
      console.error('❌ Audio Player: Error playing audio:', error);
      console.error('❌ Audio Player: Error details:', {
        message: error?.message,
        code: error?.code,
        domain: error?.domain,
        audioUrl: mantraData.audioUrl
      });

      let errorMessage = 'Failed to play audio. Please try again.';

      // Handle specific error codes
      if (error?.message?.includes('-1200') || error?.code === -1200) {
        errorMessage = 'Cannot access audio file. This may be due to:\n• Network connectivity issues\n• Server temporarily unavailable\n• Audio file moved or deleted\n\nPlease check your internet connection and try again.';
        console.log('🔍 Audio Player: -1200 error suggests network/accessibility issue');
      } else if (error?.message?.includes('sound is not loaded')) {
        errorMessage = 'Audio failed to load properly. Please try again.';
      }

      Alert.alert(t('audioPlaybackError'), errorMessage, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('retry'), onPress: () => togglePlayback() }
      ]);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const progress = targetCount > 0 ? (chantCount / targetCount) * 100 : 0;

  const handleIncrementCount = async () => {
    if (chantCount < targetCount) {
      const newCount = chantCount + 1;
      setChantCount(newCount);

      // Save progress
      if (feedId) {
        await saveCounterProgress(feedId, newCount, targetCount);
      }

      // Celebrate completion
      if (newCount === targetCount) {
        setTimeout(() => {
          Alert.alert(
            t('congratulations'),
            t('mantraChantCompleted').replace('{count}', targetCount.toString()),
            [
              { text: t('continue'), style: 'default' },
              { text: t('resetCounter'), onPress: handleResetCounter, style: 'destructive' },
            ]
          );
        }, 500);
      }
    }
  };


  const handleDecrementCount = async () => {
    if (chantCount > 0) {
      const newCount = chantCount - 1;
      console.log('🔽 Manually decremented count from', chantCount, 'to', newCount);
      setChantCount(newCount);

      // Save progress
      if (feedId) {
        await saveCounterProgress(feedId, newCount, targetCount);
      }

      // If we were auto-looping and count was reduced, ensure auto-loop continues if still below target
      if (isAutoLooping && newCount < targetCount && sound && !isLooping) {
        try {
          await sound.setIsLoopingAsync(false); // Auto-loop uses manual restart, not built-in loop
          console.log('🔄 Continuing auto-loop from adjusted count:', newCount);
        } catch (error) {
          console.error('Error adjusting auto-loop:', error);
        }
      } else if (newCount >= targetCount && isAutoLooping) {
        // If count reached target, stop auto-loop
        setIsAutoLooping(false);
        console.log('🎯 Target reached by manual decrement adjustment - stopping auto-loop');
      }
    }
  };

  const handleTargetCountChange = async (newTarget: number) => {
    console.log('🎯 Target changed from', targetCount, 'to', newTarget, '- Current count:', chantCount);
    setTargetCount(newTarget);
    setShowTargetSelector(false);

    // Check if auto-looping status should change
    if (isPlaying && sound) {
      const shouldAutoLoop = chantCount < newTarget;

      if (shouldAutoLoop && !isAutoLooping && !isLooping) {
        // Start auto-looping if count < new target
        console.log('🔄 Starting auto-loop due to target change');
        setIsAutoLooping(true);
        await sound.setIsLoopingAsync(false); // Auto-loop uses manual restart, not built-in loop
      } else if (!shouldAutoLoop && isAutoLooping) {
        // Stop auto-looping if count >= new target
        console.log('⏹️ Stopping auto-loop - target reached');
        setIsAutoLooping(false);
        await sound.setIsLoopingAsync(isLooping); // Keep manual loop if enabled
      }
    }

    // Save new target
    if (feedId) {
      await saveCounterProgress(feedId, chantCount, newTarget);
    }
  };

  const handleResetCounter = async () => {
    Alert.alert(
      t('resetCounter'),
      t('resetCounterConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reset'),
          style: 'destructive',
          onPress: async () => {
            console.log('🔄 Resetting counter to 0');
            setChantCount(0);

            // If audio is playing, restart auto-looping since count is now 0 and target > 0
            if (isPlaying && sound && targetCount > 0 && !isLooping) {
              setIsAutoLooping(true);
              await sound.setIsLoopingAsync(false); // Auto-loop uses manual restart
              console.log('🔄 Restarted auto-loop after counter reset');
            }

            if (feedId) {
              await saveCounterProgress(feedId, 0, targetCount);
            }
          },
        },
      ]
    );
  };

  const handleFinishSession = async () => {
    // Stop audio playback
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }

    // Stop auto-looping
    setIsAutoLooping(false);

    // Show completion message regardless of target reached
    Alert.alert(
      'Session Complete',
      `You have completed ${chantCount} chants. Well done on your spiritual practice!`,
      [
        {
          text: 'Continue',
          style: 'default',
          onPress: () => {
            // Allow user to continue if they want
          }
        },
        {
          text: 'Reset Counter',
          onPress: handleResetCounter,
          style: 'destructive'
        },
        {
          text: 'Go Back',
          onPress: handleBackPress,
          style: 'cancel'
        }
      ]
    );
  };

  const handleRestartSession = async () => {
    console.log('🔄 Restarting session - resetting counter and audio position');

    // Reset counter to 0
    setChantCount(0);

    // Save the reset progress
    if (feedId) {
      await saveCounterProgress(feedId, 0, targetCount);
    }

    // Reset audio position to beginning
    await seekToPosition(0);

    // If audio was playing and we have a target, restart auto-looping
    if (isPlaying && sound && targetCount > 0 && !isLooping) {
      setIsAutoLooping(true);
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setIsLoopingAsync(false); // Auto-loop uses manual restart
        }
      } catch (error) {
        console.error('Error setting loop state after restart:', error);
      }
      console.log('🔄 Restarted auto-loop after session restart');
    }

    // Show confirmation
    console.log('✅ Session restarted - Counter: 0, Position: 0:00');
  };

  // Reset all audio states
  const resetAudioStates = () => {
    console.log('🔄 Resetting all audio states...');

    setSound(null);
    soundRef.current = null;
    setIsPlaying(false);
    setIsAutoLooping(false);
    setIsAudioLoading(false);
    setPosition(0);
    setDuration(0);
    setIsSeeking(false);

    // Clear any ongoing timeouts
    if (volumeChangeTimeout.current) {
      clearTimeout(volumeChangeTimeout.current);
      volumeChangeTimeout.current = null;
    }

    console.log('✅ All audio states reset completely');
  };

  // Handle back navigation with audio cleanup
  const handleBackPress = async () => {
    console.log('⬅️ Back button pressed - stopping audio before navigation');

    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && isPlaying) {
          await sound.stopAsync();
          console.log('✅ Audio stopped on back press');
        } else {
          console.log('⚠️ Audio not playing - skipping stop');
        }
      } catch (error: any) {
        console.log('⚠️ Error stopping on back press:', error?.message || 'Unknown error');
        // Continue navigation anyway
      }
    }

    // Always navigate back regardless of audio stop result
    router.back();
  };

  // const remainingCount = targetCount - chantCount;
  // const halfwayCount = Math.floor(targetCount / 2);

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Seek to position in audio
  const seekToPosition = async (positionMillis: number) => {
    if (sound) {
      try {
        // Check if sound is loaded before seeking
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          console.log('⚠️ Cannot seek: Sound not loaded yet');
          return;
        }

        setIsSeeking(true);
        await sound.setPositionAsync(positionMillis);
        setPosition(positionMillis);
        console.log('🎯 Seeked to position:', positionMillis);

        // Haptic feedback for seeking
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error seeking audio:', error);
      } finally {
        setIsSeeking(false);
      }
    }
  };


  // Toggle playback speed
  const togglePlaybackSpeed = async () => {
    if (sound) {
      try {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        await sound.setRateAsync(nextSpeed, true);
        setPlaybackSpeed(nextSpeed);
      } catch (error) {
        console.error('Error changing playback speed:', error);
      }
    }
  };


  // Handle progress bar press for seeking
  const handleProgressBarPress = (event: any) => {
    if (duration > 0 && !isAudioLoading) {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48; // Account for padding
      const percentage = locationX / progressBarWidth;
      const seekPosition = duration * percentage;
      seekToPosition(Math.max(0, Math.min(seekPosition, duration)));
    } else if (isAudioLoading) {
      console.log('⚠️ Seek ignored: Audio still loading');
    }
  };

  // Throttled volume change for smooth dragging
  const volumeChangeTimeout = React.useRef<number | null>(null);

  // Change volume
  const changeVolume = async (newVolume: number) => {
    // Update UI immediately for smooth visual feedback
    setVolume(newVolume);

    // Throttle actual audio volume changes to prevent overwhelming the audio system
    if (volumeChangeTimeout.current) {
      clearTimeout(volumeChangeTimeout.current);
    }

    volumeChangeTimeout.current = setTimeout(async () => {
      if (sound) {
        try {
          // Check if sound is properly loaded before changing volume
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.setVolumeAsync(newVolume);
            console.log('🔊 Volume changed to:', newVolume);
          } else {
            console.log('⚠️ Cannot change volume: Sound not loaded yet');
          }
        } catch (error) {
          console.error('Error changing volume:', error);
        }
      }
    }, 50) as unknown as number; // Update audio volume every 50ms during drag
  };

  // Toggle volume slider visibility
  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };


  // Create pan responder for smooth dragging
  const volumePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (event) => {
      // Handle initial touch - only if not loading
      if (!isAudioLoading) {
        const { locationX } = event.nativeEvent;
        const sliderWidth = width - 80;
        const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
        changeVolume(percentage);
      }
    },

    onPanResponderMove: (event) => {
      // Handle dragging - only if not loading
      if (!isAudioLoading) {
        const { locationX } = event.nativeEvent;
        const sliderWidth = width - 80;
        const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
        changeVolume(percentage);
      }
    },

    onPanResponderRelease: () => {
      // Haptic feedback when released
      if (!isAudioLoading) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });


  return (
    <SafeAreaView style={styles.container}>
      {/* New Header Design */}
      <View style={styles.newHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.newBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.appName}>Bhav Bhakti</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={20} color="#8B4513" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mantra' && styles.activeTab]}
            onPress={() => setActiveTab('mantra')}
          >
            <Text style={[styles.tabText, activeTab === 'mantra' && styles.activeTabText]}>
              Mantra
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lyrics' && styles.activeTab]}
            onPress={() => setActiveTab('lyrics')}
          >
            <Text style={[styles.tabText, activeTab === 'lyrics' && styles.activeTabText]}>
              Lyrics
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {isFeedLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('loadingMantraDetails')}</Text>
        </View>
      )}

      {/* Error State */}
      {feedError && !isFeedLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color={goldenTempleTheme.colors.error} />
          <Text style={styles.errorText}>{feedError}</Text>
          <TouchableOpacity onPress={fetchFeedData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('retryButtonText')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {!isFeedLoading && !feedError && activeTab === 'mantra' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Circular Progress Card */}
          <View style={styles.progressCard}>
            {/* Circular Progress Ring */}
            <View style={styles.circularProgressContainer}>
              <View style={styles.circularProgressRing}>
                {/* SVG Progress Ring */}
                <Svg width="282" height="282" style={styles.progressSvg}>
                  {/* Background circle */}
                  <Circle
                    cx="141"
                    cy="141"
                    r="130"
                    stroke="rgba(184, 115, 74, 0.2)"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <Circle
                    cx="141"
                    cy="141"
                    r="130"
                    stroke="#CA3500"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 130}`}
                    strokeDashoffset={`${2 * Math.PI * 130 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 141 141)"
                  />
                </Svg>

                {/* Inner content */}
                <View style={styles.circularProgressContent}>
                  <View style={styles.countDisplay}>
                    <Text style={styles.progressCount}>{chantCount}</Text>
                    <Text style={styles.progressTotal}>/{targetCount}</Text>
                  </View>
                  <Text style={styles.progressTime}>
                    {formatTime(position)} / {formatTime(duration)}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditProgress(true)}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Mantra Info Card */}
          <View style={styles.mantraInfoSection}>
            <View style={styles.mantraMainInfo}>
              <Image
                source={{ uri: (mantraData.thumbnailUrl?.toString() || 'https://via.placeholder.com/100') }}
                style={styles.mantraLargeImage}
                resizeMode="cover"
              />
              <View style={styles.mantraTextInfo}>
                <Text style={styles.mantraMainTitle}>{mantraData.title}</Text>
                <Text style={styles.mantraMainSubtitle}>{mantraData.objective}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.mantraShareButton}>
              <Ionicons name="share-outline" size={24} color="#B8734A" />
            </TouchableOpacity>
          </View>

          {/* Tags */}
          {feedData?.tags && feedData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {feedData.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <TouchableOpacity
              style={styles.progressBar}
              onPress={handleProgressBarPress}
              activeOpacity={0.7}
            >
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
                  ]}
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.timeDisplay}>{formatTime(duration)}</Text>
          </View>

          {/* Audio Controls */}
          <View style={styles.audioControls}>
            {/* Speed Control Button with Label */}
            <View style={styles.controlButtonContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={togglePlaybackSpeed}
              >
                <SpeedMeter width={20} height={18} color="#B8734A" />
              </TouchableOpacity>
              <Text style={styles.controlButtonLabel}>{playbackSpeed}x</Text>
            </View>

            {/* Main Play/Pause Button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayback}
              disabled={isAudioLoading}
            >
              <LinearGradient
                colors={['#CA3500', '#B8734A']}
                style={styles.playButtonGradient}
              >
                {isAudioLoading ? (
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                    <Ionicons name="refresh" size={32} color="#FEF6DA" />
                  </Animated.View>
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="#FEF6DA"
                    style={!isPlaying ? { marginLeft: 4 } : {}}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Volume Control Button with Label */}
            <View style={styles.controlButtonContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleVolumeSlider}
              >
                <Ionicons
                  name={volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-high"}
                  size={20}
                  color="#B8734A"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleVolumeSlider}>
                <Text style={styles.controlButtonLabel}>{Math.round(volume * 100)}%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Volume Slider */}
          {showVolumeSlider && (
            <View style={styles.volumeSliderContainer}>
              <View
                style={styles.volumeSlider}
                {...volumePanResponder.panHandlers}
              >
                <View style={styles.volumeTrack}>
                  <View
                    style={[
                      styles.volumeFill,
                      { width: `${volume * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.volumeHandle,
                      { left: `${volume * 100}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.volumeLabels}>
                <Text style={styles.volumeLabel}>0%</Text>
                <Text style={styles.volumeLabel}>100%</Text>
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.restartButton}
              onPress={handleRestartSession}
            >
              <Text style={styles.restartButtonText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.finishButton} onPress={handleFinishSession}>
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Lyrics Tab Content */}
      {!isFeedLoading && !feedError && activeTab === 'lyrics' && (
        <View style={styles.lyricsContent}>
          <Text style={styles.lyricsText}>{mantraData.title}</Text>
          <Text style={styles.lyricsDescription}>{mantraData.description}</Text>
        </View>
      )}




      {/* Edit Progress Modal */}
      <Modal
        visible={showEditProgress}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProgress(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editProgressModal}>
            <Text style={styles.editProgressTitle}>Edit the progress</Text>
            <Text style={styles.editProgressSubtitle}>
              Adjust the number of chant completed in the session
            </Text>

            {/* Counter Controls */}
            <View style={styles.editCounterContainer}>
              <TouchableOpacity
                style={styles.editCounterButton}
                onPress={handleDecrementCount}
              >
                <Ionicons name="remove" size={24} color="#8B4513" />
              </TouchableOpacity>

              <Text style={styles.editCounterValue}>{chantCount}</Text>

              <TouchableOpacity
                style={styles.editCounterButton}
                onPress={handleIncrementCount}
              >
                <Ionicons name="add" size={24} color="#8B4513" />
              </TouchableOpacity>
            </View>

            {/* Quick Target Options */}
            <View style={styles.quickTargetsContainer}>
              {[21, 54, 108].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleTargetCountChange(count)}
                  style={[
                    styles.quickTargetButton,
                    targetCount === count && styles.quickTargetButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickTargetText,
                      targetCount === count && styles.quickTargetTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.editProgressActions}>
              <TouchableOpacity
                style={styles.editCancelButton}
                onPress={() => setShowEditProgress(false)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editConfirmButton}
                onPress={() => setShowEditProgress(false)}
              >
                <Text style={styles.editConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Target Count Selector Modal */}
      {showTargetSelector && (
        <View style={styles.targetSelectorOverlay}>
          <View style={styles.targetSelectorModal}>
            <Text style={styles.targetSelectorTitle}>Select Target Count</Text>
            <View style={styles.targetOptionsContainer}>
              {TARGET_COUNT_OPTIONS.map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleTargetCountChange(count)}
                  style={[
                    styles.targetOption,
                    targetCount === count && styles.targetOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.targetOptionText,
                      targetCount === count && styles.targetOptionTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowTargetSelector(false)}
              style={styles.targetSelectorCancel}
            >
              <Text style={styles.targetSelectorCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF6DA', // Updated cream background
  },
  // New Header Design
  newHeader: {
    backgroundColor: '#FEF6DA',
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  newBackButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6D5C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#F5E6D3', // Light peach background
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#CA3500', // Deep red-orange for active state
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8734A',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Main Content
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120, // Extra padding to clear bottom tab bar
  },
  // Progress Card
  progressCard: {
    backgroundColor: '#E76A4A66',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressRing: {
    width: 282,
    height: 282,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  circularProgressContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  countDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 36,
  },
  progressCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E76A4A',
  },
  progressTotal: {
    fontSize: 32,
    color: '#E76A4A',
    fontWeight: 'bold',
  },
  progressTime: {
    fontSize: 12,
    color: '#B8734A',
    fontWeight: '500',
  },
  editButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B8734A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mantra Card
  mantraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mantraImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  mantraInfo: {
    flex: 1,
  },
  mantraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B8734A',
    marginBottom: 4,
  },
  mantraSubtitle: {
    fontSize: 14,
    color: '#B8734A',
  },
  shareButton: {
    padding: 8,
  },
  // New Mantra Info Section
  mantraInfoSection: {
    position: 'relative',
    marginBottom: 10,
  },
  mantraMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 40, // Space for share button
  },
  mantraLargeImage: {
    width: 77,
    aspectRatio: 1,
    borderRadius: 12,
    marginRight: 16,
  },
  mantraTextInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  mantraMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B8734A',
    marginBottom: 8,
    lineHeight: 20,
  },
  mantraMainSubtitle: {
    fontSize: 16,
    color: '#B8734A',
    lineHeight: 22,
  },
  mantraShareButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 13,
  },
  tag: {
    backgroundColor: '#F0C4A0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  tagText: {
    fontSize: 13,
    color: '#B8734A',
    fontWeight: '500',
  },
  // Progress Bar
  progressBarContainer: {
    marginBottom: 3,
    alignItems: 'flex-end',
  },
  progressBar: {
    width: '100%',
    height: 19,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F0C4A0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B8734A',
    borderRadius: 3,
  },
  timeDisplay: {
    fontSize: 14,
    color: '#B8734A',
    fontWeight: '500',
  },
  // Audio Controls
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    marginBottom: 2,
  },
  controlButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 115, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  controlButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B8734A',
    textAlign: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Volume Slider
  volumeSliderContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  volumeSlider: {
    height: 50,
    justifyContent: 'center',
    marginBottom: 8,
    paddingVertical: 15, // Increase touch area
  },
  volumeTrack: {
    height: 8,
    backgroundColor: 'rgba(184, 115, 74, 0.2)',
    borderRadius: 4,
    position: 'relative',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#B8734A',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  volumeHandle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CA3500',
    marginLeft: -12,
    top: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  volumeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeLabel: {
    fontSize: 12,
    color: '#B8734A',
    fontWeight: '500',
  },
  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 18,
  },
  restartButton: {
    flex: 1,
    height: 37,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8734A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8734A',
  },
  finishButton: {
    flex: 1,
    height: 37,
    borderRadius: 8,
    backgroundColor: '#CA3500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // New Audio Controls
  newAudioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  newPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  speedControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 60,
    marginBottom: 30,
  },
  speedLabel: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  speedPercentage: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#CD853F',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CD853F',
  },
  actionButtonPrimary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    ...goldenTempleTheme.shadows.md,
    shadowColor: 'rgba(218, 165, 32, 0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  counterDisplay: {
    alignItems: 'center',
    position: 'relative',
  },
  currentCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: goldenTempleTheme.colors.primary.DEFAULT,
    marginBottom: 4,
  },
  targetCount: {
    fontSize: 14,
    color: goldenTempleTheme.colors.text.secondary,
    marginBottom: 8,
  },
  autoLoopStatus: {
    fontSize: 11,
    color: '#8B7355',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 3,
    borderColor: 'rgba(218, 165, 32, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.md,
    shadowColor: 'rgba(218, 165, 32, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressFillCircle: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    backgroundColor: '#FF5722', // Orange fill
    top: 0,
    left: 0,
    transformOrigin: '50% 100%',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  progressInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  incrementButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF5722', // Orange selected
    alignItems: 'center',
    justifyContent: 'center',
    ...goldenTempleTheme.shadows.sm,
  },
  targetSection: {
    alignItems: 'center',
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E37',
  },
  autoLoopIndicator: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.4)',
  },
  autoLoopText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00FF00',
  },
  targetOptions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  targetOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5E6D3', // Light peach
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    ...goldenTempleTheme.shadows.sm,
  },
  targetOptionChipSelected: {
    backgroundColor: '#FF5722',
    borderColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  targetOptionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  targetOptionChipTextSelected: {
    color: '#fff',
  },
  moreTargetsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(218, 165, 32, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
  },
  moreTargetsText: {
    fontSize: 12,
    color: '#8B7355',
  },
  // Lyrics Section - Large Video/Image Area
  lyricsSection: {
    marginBottom: 20,
  },
  lyricsContainer: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...goldenTempleTheme.shadows.lg,
  },
  lyricsBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lyricsDefaultBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '500',
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
  },
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Edit Progress Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editProgressModal: {
    backgroundColor: '#FEF6DA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  editProgressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 8,
  },
  editProgressSubtitle: {
    fontSize: 14,
    color: '#CD853F',
    textAlign: 'center',
    marginBottom: 24,
  },
  editCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  editCounterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  editCounterValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B4513',
    minWidth: 100,
    textAlign: 'center',
  },
  quickTargetsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  quickTargetButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    borderWidth: 1,
    borderColor: '#E6D5C3',
  },
  quickTargetButtonSelected: {
    backgroundColor: '#8B4513',
  },
  quickTargetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  quickTargetTextSelected: {
    color: '#FFFFFF',
  },
  editProgressActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#CD853F',
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CD853F',
  },
  editConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  editConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Lyrics Content
  lyricsContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 16,
  },
  lyricsDescription: {
    fontSize: 16,
    color: '#CD853F',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Target Selector Modal
  targetSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  targetSelectorModal: {
    backgroundColor: 'rgba(218, 165, 32, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    ...goldenTempleTheme.shadows.lg,
  },
  targetSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  targetOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  targetOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 60,
    alignItems: 'center',
  },
  targetOptionSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  targetOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  targetOptionTextSelected: {
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  targetSelectorCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  targetSelectorCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
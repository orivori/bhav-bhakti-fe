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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { Feed } from '@/types/feed';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const { width } = Dimensions.get('window');

// Target count options for mantras
const TARGET_COUNT_OPTIONS = [27, 54, 108, 216, 324, 540, 1008];

export default function AudioPlayerScreen() {
  const params = useLocalSearchParams();
  const feedId = params.feedId?.toString();
  const { t } = useTranslation();
  const { contentPadding } = useTabBarHeight();

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

      const feed = await feedService.getFeedById(feedId);
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
        title: feedData.caption || t('sacredMantra'),
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

  // Fetch feed data on component mount
  useEffect(() => {
    fetchFeedData();
  }, [feedId]);

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
                await newSound.setVolumeAsync(volume);
                console.log('🔊 Audio Player: Volume set to', volume);

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
        setIsSeeking(true);
        await sound.setPositionAsync(positionMillis);
        setPosition(positionMillis);
        // Haptic feedback for seeking
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error seeking audio:', error);
      } finally {
        setIsSeeking(false);
      }
    }
  };

  // Skip forward by 10 seconds
  const skipForward = async () => {
    if (sound && duration > 0) {
      const newPosition = Math.min(position + 10000, duration);
      await seekToPosition(newPosition);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Skip backward by 10 seconds
  const skipBackward = async () => {
    if (sound) {
      const newPosition = Math.max(position - 10000, 0);
      await seekToPosition(newPosition);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Toggle loop mode
  const toggleLoop = async () => {
    if (sound) {
      try {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (newLoopState) {
          // Manual loop enabled - disable auto-loop
          console.log('🔁 Manual loop enabled - disabling auto-loop');
          setIsAutoLooping(false);
          await sound.setIsLoopingAsync(true);
        } else {
          // Manual loop disabled - check if we should enable auto-loop
          const shouldAutoLoop = chantCount < targetCount && isPlaying;
          console.log('🔁 Manual loop disabled - Auto-loop:', shouldAutoLoop);
          setIsAutoLooping(shouldAutoLoop);
          await sound.setIsLoopingAsync(false); // Auto-loop doesn't use built-in looping
        }
      } catch (error) {
        console.error('Error toggling loop:', error);
      }
    }
  };

  // Handle progress bar press for seeking
  const handleProgressBarPress = (event: any) => {
    if (duration > 0) {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48; // Account for padding
      const percentage = locationX / progressBarWidth;
      const seekPosition = duration * percentage;
      seekToPosition(Math.max(0, Math.min(seekPosition, duration)));
    }
  };

  // Change volume
  const changeVolume = async (newVolume: number) => {
    if (sound) {
      try {
        await sound.setVolumeAsync(newVolume);
        setVolume(newVolume);
      } catch (error) {
        console.error('Error changing volume:', error);
      }
    }
  };

  // Toggle volume slider
  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={'#5D4E37'} />
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
      </View>

      {/* Separator Line */}
      <View style={styles.separator} />

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

      {/* Main Content - Scrollable */}
      {!isFeedLoading && !feedError && (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPadding }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Mantra Info Card */}
          <View style={styles.mantraCard}>
            <Text style={styles.mantraTitle}>{mantraData.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{mantraData.description}</Text>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              {mantraData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Info Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('deity')}</Text>
                <Text style={styles.infoValue}>{mantraData.deity}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('objective')}</Text>
                <Text style={styles.infoValue}>{mantraData.objective}</Text>
              </View>
            </View>
          </View>

          {/* Chant Counter Section */}
          <View style={styles.counterSection}>
            {/* Counter Display & Controls */}
            <View style={styles.counterContainer}>
              <TouchableOpacity onPress={handleDecrementCount} style={styles.counterButton}>
                <Ionicons name="remove" size={24} color={goldenTempleTheme.colors.primary.DEFAULT} />
              </TouchableOpacity>

              <View style={styles.counterDisplay}>
                <Text style={styles.currentCount}>{chantCount}</Text>
                <Text style={styles.targetCount}>/ {targetCount}</Text>
                <View style={styles.progressCircle}>
                  <View
                    style={[
                      styles.progressFillCircle,
                      {
                        transform: [{
                          rotate: `${(progress * 3.6)}deg`
                        }]
                      }
                    ]}
                  />
                  <View style={styles.progressInner}>
                    <Text style={styles.progressText}>{Math.floor(progress)}%</Text>
                  </View>
                </View>
                
              </View>

              <TouchableOpacity onPress={handleIncrementCount} style={styles.incrementButton}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Target Selection */}
            <View style={styles.targetSection}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetLabel}>{t('target')}</Text>
                {isAutoLooping && (
                  <View style={styles.autoLoopIndicator}>
                    <Text style={styles.autoLoopText}>{t('autoLoopActive')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.targetOptions}>
                {[27, 54, 108].map((count) => (
                  <TouchableOpacity
                    key={count}
                    onPress={() => handleTargetCountChange(count)}
                    style={[
                      styles.targetOptionChip,
                      targetCount === count && styles.targetOptionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.targetOptionChipText,
                        targetCount === count && styles.targetOptionChipTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setShowTargetSelector(true)}
                  style={styles.moreTargetsButton}
                >
                  <Text style={styles.moreTargetsText}>{t('more')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Mantra Lyrics Section - Large Video/Image Area */}
          <View style={styles.lyricsSection}>
            <LinearGradient
              colors={goldenTempleTheme.gradients.sunrise}
              style={styles.lyricsContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Background Image */}
              {mantraData.thumbnailUrl ? (
                <Image
                  source={{ uri: mantraData.thumbnailUrl.toString() }}
                  style={styles.lyricsBackground}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.lyricsDefaultBg}>
                  <Ionicons name="musical-notes" size={120} color="rgba(255,255,255,0.3)" />
                </View>
              )}

              {/* Overlay Gradient */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.lyricsOverlay}
              />

              {/* Content */}
              <View style={styles.lyricsContent}>
                <View style={styles.lyricsHeader}>
                  <Text style={styles.lyricsTitle}>{t('mantraLyrics')}</Text>
                  {sound && duration > 0 && (
                    <View style={styles.audioStatusIndicator}>
                      <View style={styles.audioStatusDot} />
                      <Text style={styles.audioStatusText}>{t('ready')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lyricsText}>{mantraData.title}</Text>

                {/* Single Wave Visualizer - Only one row */}
                <View style={styles.waveVisualizer}>
                  {waveAnims.map((anim, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.waveBar,
                        {
                          height: anim.interpolate({
                            inputRange: [0.2, 1.8],
                            outputRange: [6, 30], // Min 6px, Max 30px
                            extrapolate: 'clamp',
                          }),
                          opacity: isPlaying ? 0.9 : 0.4,
                        }
                      ]}
                    />
                  ))}
                </View>

                {/* Audio Progress */}
                <View style={styles.progressSection}>
                  <TouchableOpacity
                    style={styles.progressBar}
                    onPress={handleProgressBarPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
                      ]}
                    />
                    {duration > 0 && (
                      <View
                        style={[
                          styles.progressThumb,
                          {
                            left: `${(position / duration) * 100}%`,
                            opacity: isSeeking ? 1 : 0.8
                          }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Audio Controls */}
          <View style={styles.audioControls}>
            {/* Secondary Controls Row */}
            <View style={styles.secondaryControls}>
              <TouchableOpacity onPress={toggleLoop} style={styles.secondaryControlButton}>
                <Ionicons
                  name="repeat"
                  size={20}
                  color={isLooping ? '#FF5722' : '#8B7355'}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleVolumeSlider} style={styles.secondaryControlButton}>
                <Ionicons
                  name={volume > 0.5 ? "volume-high" : volume > 0 ? "volume-low" : "volume-mute"}
                  size={20}
                  color={'#5D4E37'}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlaybackSpeed} style={styles.secondaryControlButton}>
                <Text style={styles.speedText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>

            {/* Volume Slider */}
            {showVolumeSlider && (
              <View style={styles.volumeContainer}>
                <Text style={styles.volumeLabel}>Volume</Text>
                <View style={styles.volumeSliderContainer}>
                  <TouchableOpacity
                    style={styles.volumeSlider}
                    onPress={(event) => {
                      const { locationX } = event.nativeEvent;
                      const sliderWidth = 200; // Fixed width
                      const percentage = locationX / sliderWidth;
                      const newVolume = Math.max(0, Math.min(percentage, 1));
                      changeVolume(newVolume);
                    }}
                  >
                    <View style={styles.volumeTrack}>
                      <View
                        style={[
                          styles.volumeFill,
                          { width: `${volume * 100}%` }
                        ]}
                      />
                      <View
                        style={[
                          styles.volumeThumb,
                          { left: `${volume * 100}%` }
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Primary Controls Row */}
            <View style={styles.primaryControls}>
              <TouchableOpacity onPress={skipBackward} style={styles.skipButton}>
                <Ionicons name="play-skip-back" size={28} color={'#5D4E37'} />
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.playButtonContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayback}
                  disabled={isAudioLoading}
                >
                  <LinearGradient
                    colors={['#FF5722', '#E64A19']}
                    style={styles.playButtonGradient}
                  >
                    {isAudioLoading ? (
                      <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                        <Ionicons name="refresh" size={40} color="#fff" />
                      </Animated.View>
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={40}
                        color="#fff"
                        style={!isPlaying ? { marginLeft: 4 } : {}}
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity onPress={skipForward} style={styles.skipButton}>
                <Ionicons name="play-skip-forward" size={28} color={'#5D4E37'} />
              </TouchableOpacity>
            </View>

            {/* Skip Indicators */}
            <View style={styles.skipIndicators}>
              <Text style={styles.skipText}>-10s</Text>
              <Text style={styles.skipText}>+10s</Text>
            </View>
          </View>


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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da', // Light cream background
  },
  // Header with Back Button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: '#fff6da',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4E37', // Warm brown text
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(205, 180, 140, 0.2)', // Light brown separator
    marginHorizontal: goldenTempleTheme.spacing.lg,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar
    paddingBottom: 15,
    backgroundColor: '#FFFFFF', // White controls
    zIndex: 1000,
  },
  headerSpacer: {
    flex: 1,
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  // Mantra Info Card
  mantraCard: {
    backgroundColor: '#FFFFFF', // Pure white card
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mantraTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown text
    marginBottom: 12,
    textAlign: 'left',
  },
  description: {
    fontSize: 16,
    color: '#8B7355', // Medium brown text
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'left',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  tagText: {
    color: '#FF5722', // Orange selected
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E37',
    textAlign: 'center',
  },
  // Counter Section
  counterSection: {
    backgroundColor: '#FFFFFF', // White card
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.25)',
    ...goldenTempleTheme.shadows.lg,
    shadowColor: 'rgba(218, 165, 32, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
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
  lyricsOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lyricsContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  lyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lyricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  audioStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.3)',
  },
  audioStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF00',
    marginRight: 4,
  },
  audioStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  audioVisualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 12,
    height: 30,
  },
  visualizerBar: {
    width: 3,
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
    opacity: 0.6,
  },
  waveVisualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 12,
    height: 25,
    paddingHorizontal: 15,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
    opacity: 0.9,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  lyricsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  progressSection: {
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 8,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#edc77a',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD700',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Audio Controls
  audioControls: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.6)',
    ...goldenTempleTheme.shadows.lg,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  secondaryControlButton: {
    padding: 10,
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    minWidth: 50,
    alignItems: 'center',
    ...goldenTempleTheme.shadows.sm,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D4E37',
  },
  primaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 12,
  },
  skipButton: {
    padding: 14,
    backgroundColor: '#F5E6D3',
    borderRadius: 25,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    ...goldenTempleTheme.shadows.sm,
  },
  playButtonContainer: {
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.lg,
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 10,
    color: '#8B7355',
    fontWeight: '500',
  },
  volumeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.6)',
    ...goldenTempleTheme.shadows.md,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
    marginBottom: 8,
  },
  volumeSliderContainer: {
    alignItems: 'center',
  },
  volumeSlider: {
    width: 200,
    height: 20,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    backgroundColor: '#F5E6D3',
    borderRadius: 2,
    position: 'relative',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 2,
  },
  volumeThumb: {
    position: 'absolute',
    top: -6,
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
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { feedService } from '@/features/feed/services/feedService';
import { Feed } from '@/types/feed';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { CounterSheet, InfoSheet } from '@/components/molecules/AudioPlayerSheets';

const { width } = Dimensions.get('window');

// Target count options for mantras
const TARGET_COUNT_OPTIONS = [27, 54, 108, 216, 324, 540, 1008];

export default function AudioPlayerScreen() {
  const params = useLocalSearchParams();
  const feedId = params.feedId?.toString();
  const autoPlay = params.autoPlay === 'true';
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

  // Audio state. Playback position/duration/playing/loaded state all come
  // reactively from `status` below - no local state mirrors them, matching
  // the pattern already proven in RingtoneFeedCard.tsx (avoids the class of
  // desync bug where a manually-toggled flag drifts from the real player
  // state). `isAudioLoading` is the one true local flag: expo-audio's
  // AudioStatus has no `error` field the way expo-av's did, so there's no
  // native "it failed" signal to react to - this is purely a "waiting for
  // status.isLoaded to flip" UI flag, resolved by the effect further down.
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isAutoLooping, setIsAutoLooping] = useState(false); // Auto-loop until target reached
  const autoPlayTriggeredRef = React.useRef(false); // Ensures the autoPlay param only starts playback once

  // Player is created once (with no source) for this screen's lifetime.
  // expo-audio's useAudioPlayer auto-releases the player on unmount via
  // useReleasingSharedObject - there is no manual unload/release call to
  // write here, and (importantly) no way to opt out of that auto-release
  // from within this file. See the migration notes for why that means this
  // change alone does not make playback survive back-navigation.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Bottom sheet refs
  const counterSheetRef = React.useRef<BottomSheetModal>(null);
  const infoSheetRef = React.useRef<BottomSheetModal>(null);

  // Refs to store current state values for callback access (fixes stale closure issue)
  const isAutoLoopingRef = React.useRef(isAutoLooping);
  const chantCountRef = React.useRef(chantCount);
  const targetCountRef = React.useRef(targetCount);
  const feedIdRef = React.useRef(feedId);

  // Animation values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const waveAnims = React.useRef([...Array(20)].map(() => new Animated.Value(1))).current;

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

  // Resolve the currently-active content's display data from the fetched feed
  // (or fallback route params before the fetch resolves). Kept as a single
  // generic shape so this screen can serve any repeatable/non-repeatable
  // audio content type (Mantra today, Aarti/Bhajan later) without a rewrite.
  const getContentData = () => {
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

  const contentData = getContentData();

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
    console.log('🌊 Wave Effect: playing changed to', status.playing);

    if (status.playing) {
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
  }, [status.playing]);

  const startWaveAnimations = () => {
    console.log('🌊 Starting wave animations...');

    waveAnims.forEach((anim, index) => {
      // Set initial random value
      anim.setValue(0.5 + Math.random() * 0.8);

      const animateBar = () => {
        if (!status.playing) return;

        Animated.timing(anim, {
          toValue: 0.3 + Math.random() * 1.2, // Random between 0.3 and 1.5
          duration: 400 + Math.random() * 300,
          useNativeDriver: false,
        }).start(() => {
          // Continue animating if still playing
          if (status.playing) {
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

  // Initialize audio session for persistent (background-surviving) playback,
  // unlike Ringtones' deliberately ephemeral, foreground-only mode. Runs
  // once on mount - no cleanup/unload here, and no [player]-keyed rerun, on
  // purpose: this only configures the shared native audio session, it does
  // not own the player's lifecycle (useAudioPlayer already does that).
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🔊 Audio Player: Setting up persistent audio session...');

        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'duckOthers',
        });

        console.log('✅ Audio Player: Audio session configured for persistent playback');
      } catch (error) {
        console.error('❌ Audio Player: Failed to set audio mode:', error);
      }
    };

    initializeAudio();
  }, []);

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
        if (status.playing) pulse();
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

    console.log('🎵 Animation Effect: playing =', status.playing, 'isAudioLoading =', isAudioLoading);

    if (status.playing) {
      pulse();
    } else {
      pulseAnim.setValue(1);
    }

    if (isAudioLoading) {
      spin();
    } else {
      rotateAnim.setValue(0);
    }
  }, [status.playing, isAudioLoading]);

  // Resolve isAudioLoading once the player actually finishes loading. There
  // is no `status.error` field in expo-audio the way expo-av had - so unlike
  // the old retry/fallback scaffolding this replaces, a load that never
  // resolves has no distinct failure signal to react to, and this timeout is
  // the only safety net available for that case.
  useEffect(() => {
    if (!isAudioLoading) return;

    if (status.isLoaded) {
      setIsAudioLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsAudioLoading(false);
      Alert.alert(t('audioNotAvailableTitle'), t('audioConnectionError'));
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isAudioLoading, status.isLoaded]);

  // Handle audio playback
  const togglePlayback = () => {
    try {
      if (status.isLoaded) {
        if (status.playing) {
          console.log('⏸️ Pausing audio - stopping auto-loop');
          player.pause();
          setIsAutoLooping(false);
        } else {
          console.log('▶️ Resuming audio');

          // Check if we should restart auto-looping
          const shouldAutoLoop = chantCount < targetCount && !isLooping;
          setIsAutoLooping(shouldAutoLoop);
          // Auto-loop always restarts manually on natural finish (see the
          // didJustFinish effect below) - it never uses the native loop
          // flag, which is reserved for the manual "repeat" toggle.
          player.loop = shouldAutoLoop ? false : isLooping;
          console.log(shouldAutoLoop ? '🔄 Resuming with auto-loop' : '▶️ Resuming with manual loop setting', '- Count:', chantCount, 'Target:', targetCount);

          player.play();
        }
        return;
      }

      if (!contentData.audioUrl) {
        console.log('❌ Audio Player: No audio URL provided');
        Alert.alert(t('audioPlaybackError'), t('noAudioUrlError'));
        return;
      }

      console.log('🎵 Audio Player: Loading audio from URL:', contentData.audioUrl);
      setIsAudioLoading(true);

      // Determine if we should auto-loop (when count < target)
      const shouldAutoLoop = chantCount < targetCount;
      setIsAutoLooping(shouldAutoLoop);
      console.log('🎵 Audio setup - Count:', chantCount, 'Target:', targetCount, 'Auto-loop:', shouldAutoLoop);

      player.loop = isLooping && !shouldAutoLoop; // Only the manual loop uses the native loop flag
      player.volume = volume;
      player.shouldCorrectPitch = false;
      player.setPlaybackRate(playbackSpeed); // playbackRate is a getter-only property at runtime - must go through setPlaybackRate()
      player.replace({ uri: contentData.audioUrl.toString() });
      player.play();
    } catch (error: any) {
      console.error('❌ Audio Player: Error playing audio:', error);
      setIsAudioLoading(false);

      Alert.alert(t('audioPlaybackError'), 'Failed to play audio. Please try again.', [
        { text: t('cancel'), style: 'cancel' },
        { text: t('retry'), onPress: () => togglePlayback() },
      ]);
    }
  };

  // Auto-start playback when navigated here with autoPlay=true (e.g. Home's "Play now").
  // togglePlayback is otherwise only ever invoked by a user tap, so without this effect
  // the autoPlay param would have nothing to trigger it.
  useEffect(() => {
    if (autoPlay && !autoPlayTriggeredRef.current && !isFeedLoading && contentData.audioUrl && !status.isLoaded) {
      autoPlayTriggeredRef.current = true;
      togglePlayback();
    }
  }, [autoPlay, isFeedLoading, contentData.audioUrl, status.isLoaded]);

  // Handle natural end-of-track: auto-loop restart + counter increment.
  // Unlike expo-av, expo-audio does not auto-rewind position on finish, and
  // there's no setOnPlaybackStatusUpdate registration to close over stale
  // values - useAudioPlayerStatus already re-renders this effect with fresh
  // state on every status change, so the ref reads below are a belt-and-
  // braces match for today's exact logic rather than a strict requirement.
  useEffect(() => {
    if (!status.didJustFinish) return;

    console.log('🎵 Audio Player: Audio playback finished');

    const currentAutoLooping = isAutoLoopingRef.current;
    const currentCount = chantCountRef.current;
    const currentTarget = targetCountRef.current;
    const currentFeedId = feedIdRef.current;

    console.log('🔄 Using ref values - Auto-looping:', currentAutoLooping, 'Count:', currentCount, 'Target:', currentTarget);

    if (currentAutoLooping && currentCount < currentTarget) {
      const newCount = currentCount + 1;
      console.log('🔄 Auto-looping active - incrementing count from', currentCount, 'to', newCount);
      setChantCount(newCount);

      if (currentFeedId) {
        saveCounterProgress(currentFeedId, newCount, currentTarget).catch(console.error);
      }

      if (newCount >= currentTarget) {
        console.log('🎯 Target reached! Stopping auto-loop');
        setIsAutoLooping(false);
        player.seekTo(0).catch(console.error);

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
        console.log('🔄 Target not reached, restarting audio for repetition', newCount);

        (async () => {
          try {
            await player.seekTo(0);
            player.play();
            console.log('✅ Audio restarted successfully for repetition', newCount);
          } catch (error) {
            console.error('❌ Restart failed, stopping auto-loop:', error);
            setIsAutoLooping(false);
          }
        })();
      }
    } else {
      console.log('⏹️ Not auto-looping or target reached - stopping playback');
      player.seekTo(0).catch(console.error);

      // Manual increment if not looping and count < target
      if (!isLooping && currentCount < currentTarget) {
        console.log('📈 Manual increment after song finish');
        handleIncrementCount();
      }
    }
  }, [status.didJustFinish, player]);

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
      if (isAutoLooping && newCount < targetCount && status.isLoaded && !isLooping) {
        player.loop = false; // Auto-loop uses manual restart, not the native loop flag
        console.log('🔄 Continuing auto-loop from adjusted count:', newCount);
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
    if (status.playing && status.isLoaded) {
      const shouldAutoLoop = chantCount < newTarget;

      if (shouldAutoLoop && !isAutoLooping && !isLooping) {
        // Start auto-looping if count < new target
        console.log('🔄 Starting auto-loop due to target change');
        setIsAutoLooping(true);
        player.loop = false; // Auto-loop uses manual restart, not the native loop flag
      } else if (!shouldAutoLoop && isAutoLooping) {
        // Stop auto-looping if count >= new target
        console.log('⏹️ Stopping auto-loop - target reached');
        setIsAutoLooping(false);
        player.loop = isLooping; // Keep manual loop if enabled
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
            if (status.playing && status.isLoaded && targetCount > 0 && !isLooping) {
              setIsAutoLooping(true);
              player.loop = false; // Auto-loop uses manual restart
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

  // expo-audio reports position/duration in seconds, not milliseconds like
  // expo-av did - converted only here, at the display boundary, matching the
  // pattern already used in the Ringtones migration.
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Seek to position in audio. No optimistic local position state is kept
  // during the seek (unlike the old expo-av code) - status.currentTime is
  // the single source of truth, so there's up to ~500ms of visual lag before
  // the thumb reflects a tap-to-seek. Same accepted trade-off as the
  // Ringtones migration, for the same reason: reintroducing manual position
  // state would undo the point of the reactive status hook.
  const seekToPosition = async (positionSeconds: number) => {
    if (status.isLoaded) {
      try {
        await player.seekTo(positionSeconds);
        // Haptic feedback for seeking
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  // Skip forward by 10 seconds
  const skipForward = async () => {
    if (status.isLoaded && status.duration > 0) {
      const newPosition = Math.min(status.currentTime + 10, status.duration);
      await seekToPosition(newPosition);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Skip backward by 10 seconds
  const skipBackward = async () => {
    if (status.isLoaded) {
      const newPosition = Math.max(status.currentTime - 10, 0);
      await seekToPosition(newPosition);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Toggle playback speed
  const togglePlaybackSpeed = () => {
    if (status.isLoaded) {
      try {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        player.shouldCorrectPitch = true;
        player.setPlaybackRate(nextSpeed);
        setPlaybackSpeed(nextSpeed);
      } catch (error) {
        console.error('Error changing playback speed:', error);
      }
    }
  };

  // Toggle loop mode
  const toggleLoop = () => {
    if (status.isLoaded) {
      try {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (newLoopState) {
          // Manual loop enabled - disable auto-loop
          console.log('🔁 Manual loop enabled - disabling auto-loop');
          setIsAutoLooping(false);
          player.loop = true;
        } else {
          // Manual loop disabled - check if we should enable auto-loop
          const shouldAutoLoop = chantCount < targetCount && status.playing;
          console.log('🔁 Manual loop disabled - Auto-loop:', shouldAutoLoop);
          setIsAutoLooping(shouldAutoLoop);
          player.loop = false; // Auto-loop doesn't use the native loop flag
        }
      } catch (error) {
        console.error('Error toggling loop:', error);
      }
    }
  };

  // Handle progress bar press for seeking
  const handleProgressBarPress = (event: any) => {
    if (status.duration > 0) {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48; // Account for padding
      const percentage = locationX / progressBarWidth;
      const seekPosition = status.duration * percentage;
      seekToPosition(Math.max(0, Math.min(seekPosition, status.duration)));
    }
  };

  // Change volume
  const changeVolume = (newVolume: number) => {
    if (status.isLoaded) {
      try {
        player.volume = newVolume;
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

      {/* Main Content - fixed three-region layout, no scrolling */}
      {!isFeedLoading && !feedError && (
        <View style={[styles.playerBody, { paddingBottom: contentPadding }]}>
          {/* Compact content header strip */}
          <View style={styles.contentHeaderStrip}>
            <View style={styles.contentHeaderTextBlock}>
              <Text numberOfLines={1} style={styles.contentTitleCompact}>{contentData.title}</Text>
              <Text numberOfLines={1} style={styles.contentSubtitleCompact}>{contentData.deity}</Text>
            </View>
            <TouchableOpacity
              onPress={() => infoSheetRef.current?.present()}
              style={styles.headerIconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={22} color={'#5D4E37'} />
            </TouchableOpacity>
          </View>

          {/* Visual Area - flexible, fills remaining space */}
          <View style={styles.lyricsSection}>
            <LinearGradient
              colors={goldenTempleTheme.gradients.sunrise}
              style={styles.lyricsContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Background Image */}
              {contentData.thumbnailUrl ? (
                <Image
                  source={{ uri: contentData.thumbnailUrl.toString() }}
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
                  {status.isLoaded && status.duration > 0 && (
                    <View style={styles.audioStatusIndicator}>
                      <View style={styles.audioStatusDot} />
                      <Text style={styles.audioStatusText}>{t('ready')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lyricsText}>{contentData.title}</Text>

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
                          opacity: status.playing ? 0.9 : 0.4,
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
                        { width: status.duration > 0 ? `${(status.currentTime / status.duration) * 100}%` : '0%' },
                      ]}
                    />
                    {status.duration > 0 && (
                      <View
                        style={[
                          styles.progressThumb,
                          {
                            left: `${(status.currentTime / status.duration) * 100}%`,
                            opacity: 0.8,
                          }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Compact Control Bar - fixed */}
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

              <TouchableOpacity onPress={togglePlaybackSpeed} style={styles.secondaryControlButton}>
                <Text style={styles.speedText}>{playbackSpeed}x</Text>
              </TouchableOpacity>

              {/* Counter sheet trigger - only for content flagged as repeatable */}
              {feedData?.isRepeatable && (
                <TouchableOpacity
                  onPress={() => counterSheetRef.current?.present()}
                  style={styles.secondaryControlButton}
                >
                  <Ionicons name="stats-chart-outline" size={20} color={designSystemTheme.colors.primary} />
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterBadgeText}>{chantCount}/{targetCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
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
                        name={status.playing ? 'pause' : 'play'}
                        size={40}
                        color="#fff"
                        style={!status.playing ? { marginLeft: 4 } : {}}
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
        </View>
      )}

      {/* Chant counter, moved off-screen into an overlay sheet */}
      <CounterSheet
        ref={counterSheetRef}
        chantCount={chantCount}
        targetCount={targetCount}
        isAutoLooping={isAutoLooping}
        onIncrement={handleIncrementCount}
        onDecrement={handleDecrementCount}
        onSelectTarget={handleTargetCountChange}
        onOpenMoreTargets={() => setShowTargetSelector(true)}
      />

      {/* Description/tags/deity/objective, moved off-screen into an overlay sheet */}
      <InfoSheet
        ref={infoSheetRef}
        title={contentData.title as string}
        description={contentData.description as string}
        deity={contentData.deity as string}
        objective={contentData.objective as string}
        tags={(contentData.tags as string[]) || []}
      />

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
  // Main player body - fixed three-region layout (header strip / visual area / controls)
  playerBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  // Compact Content Header Strip
  contentHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  contentHeaderTextBlock: {
    flex: 1,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  contentTitleCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  contentSubtitleCompact: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
  },
  headerIconButton: {
    padding: 6,
  },
  // Lyrics Section - flexible visual area
  lyricsSection: {
    flex: 1,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  lyricsContainer: {
    flex: 1,
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
  // Audio Controls - compact, fixed
  audioControls: {
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.6)',
    ...goldenTempleTheme.shadows.lg,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 14,
    paddingHorizontal: 8,
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
  counterBadge: {
    marginTop: 2,
  },
  counterBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  speedText: {
    fontSize: 16,
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

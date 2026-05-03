import { Mixpanel } from 'mixpanel-react-native';
import { MIXPANEL_CONFIG, MIXPANEL_EVENTS } from '@/config/mixpanel';

class MixpanelService {
  private mixpanel: Mixpanel | null = null;
  private isInitialized = false;

  async init(customToken?: string) {
    if (this.isInitialized) return;

    try {
      // Set the token if provided
      if (customToken) {
        MIXPANEL_CONFIG.setTokens(customToken, customToken);
      }

      const token = MIXPANEL_CONFIG.getToken();

      if (!token) {
        console.warn('⚠️ Mixpanel token not provided. Analytics will be disabled.');
        return;
      }

      this.mixpanel = new Mixpanel(token, true);
      await this.mixpanel.init();
      this.isInitialized = true;
      console.log('✅ Mixpanel initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Mixpanel:', error);
    }
  }

  // User identification and properties
  identify(userId: string) {
    if (!this.mixpanel || !this.isInitialized) return;
    this.mixpanel.identify(userId);
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.mixpanel || !this.isInitialized) return;
    this.mixpanel.getPeople().set(properties);
  }

  // Event tracking methods
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.mixpanel || !this.isInitialized) {
      console.warn('⚠️ Mixpanel not initialized, event not tracked:', eventName);
      return;
    }

    const eventProperties = {
      ...MIXPANEL_CONFIG.getDefaultProperties(),
      ...properties,
      timestamp: new Date().toISOString(),
    };

    this.mixpanel.track(eventName, eventProperties);
    console.log('📊 Event tracked:', eventName, eventProperties);
  }

  // Authentication Events
  trackLogin(method: string) {
    this.track('User Login', {
      login_method: method,
    });
  }

  trackLogout() {
    this.track('User Logout');
  }

  trackSignup(method: string) {
    this.track('User Signup', {
      signup_method: method,
    });
  }

  // Profile Events
  trackProfileUpdate(field: string) {
    this.track('Profile Updated', {
      updated_field: field,
    });
  }

  trackProfilePhotoUpload() {
    this.track('Profile Photo Upload');
  }

  // Content Events
  trackFeedView(feedId: string, feedType: string) {
    this.track('Feed Viewed', {
      feed_id: feedId,
      feed_type: feedType,
    });
  }

  trackFeedLike(feedId: string, feedType: string) {
    this.track('Feed Liked', {
      feed_id: feedId,
      feed_type: feedType,
    });
  }

  trackFeedShare(feedId: string, feedType: string, shareMethod: string) {
    this.track('Feed Shared', {
      feed_id: feedId,
      feed_type: feedType,
      share_method: shareMethod,
    });
  }

  trackFeedDownload(feedId: string, feedType: string) {
    this.track('Feed Downloaded', {
      feed_id: feedId,
      feed_type: feedType,
    });
  }

  // Audio Player Events
  trackAudioPlay(feedId: string, title: string) {
    this.track('Audio Started', {
      feed_id: feedId,
      audio_title: title,
    });
  }

  trackAudioPause(feedId: string, currentTime: number) {
    this.track('Audio Paused', {
      feed_id: feedId,
      current_time: currentTime,
    });
  }

  trackAudioComplete(feedId: string, duration: number) {
    this.track('Audio Completed', {
      feed_id: feedId,
      duration: duration,
    });
  }

  // Search Events
  trackSearch(query: string, category: string) {
    this.track('Search Performed', {
      search_query: query,
      search_category: category,
    });
  }

  // Navigation Events
  trackScreenView(screenName: string) {
    this.track('Screen Viewed', {
      screen_name: screenName,
    });
  }

  trackCategoryPress(category: string) {
    this.track('Category Selected', {
      category: category,
    });
  }

  // Horoscope Events
  trackHoroscopeView(zodiacSign: string, date: string) {
    this.track('Horoscope Viewed', {
      zodiac_sign: zodiacSign,
      date: date,
    });
  }

  trackZodiacCalculation(dateOfBirth: string, zodiacSign?: string) {
    this.track('Zodiac Calculated', {
      date_of_birth: dateOfBirth,
      calculated_sign: zodiacSign,
    });
  }

  // Premium Events
  trackPremiumUpgrade() {
    this.track('Premium Upgrade Started');
  }

  trackPremiumPurchase(plan: string, amount: number) {
    this.track('Premium Purchased', {
      plan: plan,
      amount: amount,
    });
  }

  // Language Events
  trackLanguageChange(fromLanguage: string, toLanguage: string) {
    this.track('Language Changed', {
      from_language: fromLanguage,
      to_language: toLanguage,
    });
  }

  // Ringtone Events
  trackRingtoneSet(feedId: string, title: string) {
    this.track('Ringtone Set', {
      feed_id: feedId,
      ringtone_title: title,
    });
  }

  // Wallpaper Events
  trackWallpaperView(feedId: string, deityId?: string) {
    this.track('Wallpaper Viewed', {
      feed_id: feedId,
      deity_id: deityId,
    });
  }

  trackWallpaperDownload(feedId: string, deityId?: string) {
    this.track('Wallpaper Downloaded', {
      feed_id: feedId,
      deity_id: deityId,
    });
  }

  // App Lifecycle Events
  trackAppLaunch() {
    this.track('App Launched');
  }

  trackAppBackground() {
    this.track('App Backgrounded');
  }

  trackAppForeground() {
    this.track('App Foregrounded');
  }

  // Error Events
  trackError(error: string, screen?: string) {
    this.track('Error Occurred', {
      error_message: error,
      screen: screen,
    });
  }

  // Flush events (call before app closes)
  flush() {
    if (this.mixpanel && this.isInitialized) {
      this.mixpanel.flush();
    }
  }

  // Reset user data (on logout)
  reset() {
    if (this.mixpanel && this.isInitialized) {
      this.mixpanel.reset();
    }
  }
}

// Create singleton instance
export const mixpanel = new MixpanelService();
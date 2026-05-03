// Environment-based configuration
const getTokenFromEnv = () => {
  // In a real app, you would use process.env or a secure config service
  // For now, return null to indicate tokens should be loaded from external config
  return null;
};

// Mixpanel Configuration
export const MIXPANEL_CONFIG = {
  // Tokens should be loaded from environment or secure storage
  DEV_TOKEN: getTokenFromEnv() || '', // Empty string forces external configuration
  PROD_TOKEN: getTokenFromEnv() || '', // Empty string forces external configuration

  // Get the appropriate token based on environment
  getToken: () => {
    const token = __DEV__ ? MIXPANEL_CONFIG.DEV_TOKEN : MIXPANEL_CONFIG.PROD_TOKEN;

    if (!token) {
      console.error('❌ Mixpanel token not configured. Please set MIXPANEL_TOKEN via setToken() method');
      return '';
    }

    return token;
  },

  // Method to set tokens at runtime (called from app initialization)
  setTokens: (devToken: string, prodToken: string) => {
    MIXPANEL_CONFIG.DEV_TOKEN = devToken;
    MIXPANEL_CONFIG.PROD_TOKEN = prodToken;
  },

  // Default event properties that will be added to every event
  getDefaultProperties: () => ({
    app_name: 'Bhav Bhakti',
    app_version: '1.0.0',
    platform: 'react-native',
  }),
};

// Event Names - centralized event naming to avoid typos
export const MIXPANEL_EVENTS = {
  // Authentication Events
  USER_LOGIN: 'User Login',
  USER_LOGOUT: 'User Logout',
  USER_SIGNUP: 'User Signup',

  // Profile Events
  PROFILE_UPDATED: 'Profile Updated',
  PROFILE_PHOTO_UPLOAD: 'Profile Photo Upload',

  // Feed Events
  FEED_VIEWED: 'Feed Viewed',
  FEED_LIKED: 'Feed Liked',
  FEED_SHARED: 'Feed Shared',
  FEED_DOWNLOADED: 'Feed Downloaded',

  // Audio Events
  AUDIO_STARTED: 'Audio Started',
  AUDIO_PAUSED: 'Audio Paused',
  AUDIO_COMPLETED: 'Audio Completed',

  // Search Events
  SEARCH_PERFORMED: 'Search Performed',

  // Navigation Events
  SCREEN_VIEWED: 'Screen Viewed',
  CATEGORY_SELECTED: 'Category Selected',

  // Horoscope Events
  HOROSCOPE_VIEWED: 'Horoscope Viewed',
  ZODIAC_CALCULATED: 'Zodiac Calculated',

  // Premium Events
  PREMIUM_UPGRADE_STARTED: 'Premium Upgrade Started',
  PREMIUM_PURCHASED: 'Premium Purchased',

  // Language Events
  LANGUAGE_CHANGED: 'Language Changed',

  // Ringtone Events
  RINGTONE_SET: 'Ringtone Set',

  // Wallpaper Events
  WALLPAPER_VIEWED: 'Wallpaper Viewed',
  WALLPAPER_DOWNLOADED: 'Wallpaper Downloaded',

  // App Lifecycle Events
  APP_LAUNCHED: 'App Launched',
  APP_BACKGROUNDED: 'App Backgrounded',
  APP_FOREGROUNDED: 'App Foregrounded',

  // Error Events
  ERROR_OCCURRED: 'Error Occurred',
} as const;

// User Properties - standardized user property names
export const MIXPANEL_USER_PROPERTIES = {
  PHONE_NUMBER: 'phone_number',
  COUNTRY_CODE: 'country_code',
  NAME: 'name',
  EMAIL: 'email',
  DATE_OF_BIRTH: 'date_of_birth',
  ZODIAC_SIGN: 'zodiac_sign',
  LANGUAGE: 'language',
  PREMIUM_STATUS: 'premium_status',
  CREATED_AT: 'created_at',
  LAST_LOGIN: 'last_login',
} as const;
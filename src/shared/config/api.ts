export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'https://api.orivori.com/api' // Your local development server IP
    : 'https://api.orivori.com/api', // Production URL with HTTPS
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2,
};

export const API_ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/v1/auth/send-otp',
    VERIFY_OTP: '/v1/auth/verify-otp',
    LOGOUT: '/v1/auth/logout',
  },
  USER: {
    PROFILE: '/v1/user/profile',
    UPDATE_PROFILE: '/v1/user/profile',
  },
  HOROSCOPE: {
    CALCULATE_ZODIAC: '/v1/horoscope/zodiac/calculate',
    GET_MY_ZODIAC: '/v1/horoscope/zodiac/me',
    SET_MY_ZODIAC: '/v1/horoscope/zodiac/me',
    UPDATE_PREFERENCES: '/v1/horoscope/zodiac/preferences',
    TODAY: '/v1/horoscope/today',
    BY_SIGN: (sign: string) => `/v1/horoscope/today/${sign}`,
    BY_DATE: (date: string) => `/v1/horoscope/date/${date}`,
    WEEKLY: '/v1/horoscope/week',
    ALL_SIGNS: '/v1/horoscope/all-signs',
    TRACK_READ: '/v1/horoscope/read',
    SUBMIT_FEEDBACK: '/v1/horoscope/feedback',
    HISTORY: '/v1/horoscope/history',
    COMPATIBILITY: '/v1/horoscope/compatibility',
  },
  FEED: {
    LIST: '/v1/feed',
    CREATE: '/v1/feed',
    GET_BY_ID: (feedId: string) => `/v1/feed/${feedId}`,
    UPDATE: (feedId: string) => `/v1/feed/${feedId}`,
    DELETE: (feedId: string) => `/v1/feed/${feedId}`,
    LIKE: (feedId: string) => `/v1/feed/${feedId}/like`,
    UNLIKE: (feedId: string) => `/v1/feed/${feedId}/like`,
    DOWNLOAD: (feedId: string) => `/v1/feed/${feedId}/download`,
    SHARE: (feedId: string) => `/v1/feed/${feedId}/share`,
    VIEW: (feedId: string) => `/v1/feed/${feedId}/view`,
    USER_LIKED: '/v1/feed/user/liked',
    TRENDING: '/v1/feed/trending',
    POPULAR_TAGS: '/v1/feed/tags/popular',
  },
} as const;
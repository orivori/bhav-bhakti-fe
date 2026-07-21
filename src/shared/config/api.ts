import Constants from 'expo-constants';

const getDevBaseUrl = () => {
  // hostUri is the Metro dev server's <host>:<port>, e.g. "192.168.1.5:8081" on a
  // physical device over WiFi, or the emulator's routable host alias — same value
  // Expo itself uses to reach this machine, so the backend (port 3000) is reachable
  // at the same host with no manually maintained IP.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host) {
    throw new Error(
      'Could not determine dev server host from Constants.expoConfig.hostUri — is Metro running?'
    );
  }
  return `http://${host}:3000/api`;
};

export const API_CONFIG = {
  BASE_URL: __DEV__ ? getDevBaseUrl() : 'https://api.orivori.com/api', // Production URL with HTTPS
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
    PLAY: (feedId: string) => `/v1/feed/${feedId}/play`,
    USER_LIKED: '/v1/feed/user/liked',
    TRENDING: '/v1/feed/trending',
    POPULAR_TAGS: '/v1/feed/tags/popular',
  },
  CATEGORIES: {
    LIST: '/v1/categories',
    GET_BY_ID: (categoryId: number) => `/v1/categories/${categoryId}`,
    FEEDS: (categoryId: number) => `/v1/categories/${categoryId}/feeds`,
  },
  QUIZ: {
    GET_QUIZ: (type: string) => `/v1/quiz/${type}`,
    START: (type: string) => `/v1/quiz/${type}/start`,
    GET_QUESTION: (sessionId: string, questionNumber: number) => `/v1/quiz/question/${sessionId}/${questionNumber}`,
    SUBMIT_ANSWER: '/v1/quiz/answer',
    GET_RESULTS: (sessionId: string) => `/v1/quiz/results/${sessionId}`,
    HISTORY: '/v1/quiz/history',
  },
} as const;
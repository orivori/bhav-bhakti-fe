// Configuration for secrets - uses environment variables in builds
// Fallback to hardcoded values for local development

export const SECRETS = {
  MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '261869eed1d29c9318debc59da116528',
  // Add other secrets here as needed
  // API_KEY: process.env.EXPO_PUBLIC_API_KEY || 'fallback-key',
};
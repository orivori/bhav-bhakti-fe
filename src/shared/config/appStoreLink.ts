// The production app's Play Store package ID - the only app ID any store
// link uses, even from a .dev build: a share recipient can only ever install
// the public app, and the update prompt must open the public listing too.
// Hardcoded on purpose: app.config.js picks the package per build variant, so
// on a .dev build nothing readable at runtime holds the production ID.
export const PRODUCTION_PACKAGE_ID = 'com.orivori.bhavbhakti';

// The public Play Store listing - shared in every share caption that links
// back to the app, and the update prompt's fallback when the Play Store app
// itself can't be opened.
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PRODUCTION_PACKAGE_ID}`;

// Opens the listing straight in the Play Store app (no browser hop).
export const PLAY_STORE_MARKET_URL = `market://details?id=${PRODUCTION_PACKAGE_ID}`;

# Bhav Bhakti — Project Context

*Last verified against actual code/config: 2026-07-17.*

## 1. Project overview

Bhav Bhakti is a devotional content app: wallpapers, ringtones, daily horoscopes (Rashifal), quizzes, and a social "feed" of devotional content (mantras, etc.).

Two sibling repos live under this parent folder (`D:\bhav_bhakti`, which is **not itself a git repo** — only the two subfolders below are):
- `bhav-bhakti-fe` — Expo / React Native frontend (Expo Router, TypeScript, Zustand, `expo-av`). GitHub: `orivori/bhav-bhakti-fe`.
- `bhav-bhakti-be` — Express / Sequelize backend (MySQL). GitHub: `orivori/bhav-bhakti-be`.

**Founder context:** solo, non-technical founder. No dev team — all implementation work goes through Claude Code. When a decision has technical tradeoffs, explain them in plain language before the founder has to choose.

## 2. Backend infrastructure

**Database:** MySQL, run natively on local Windows for development (`DB_HOST=localhost`, `.env` in `bhav-bhakti-be`). Not Docker for local dev — `dev`/`start` npm scripts run plain `nodemon`/`node` against local MySQL directly. Note: Docker files (`Dockerfile`, `docker-compose.yml`, `docker-compose.cost-efficient.yml`) still exist in the repo and are referenced by `DEPLOYMENT_GUIDE.md` as a planned AWS EC2 + Docker **production** deployment path — they weren't deleted, just unused for local dev. Don't assume "Docker was abandoned" means the files are gone.
- **20** Sequelize models in `src/models/` (Category, DailyHoroscope, Deity, Feed, FeedDownload, FeedLike, FeedMedia, FeedShare, FeedTag, HoroscopeFeedback, HoroscopeReadHistory, LoginHistory, OTPLog, Quiz, QuizOption, QuizQuestion, QuizResponse, User, UserProfile, UserZodiac).
- **35** migration files in `src/database/migrations/`.
- **No external/cloud DB hosting yet** — confirmed no Railway config, no `app.yaml`, no Procfile, no active Cloud SQL setup. This remains a real gap before launch. (Railway vs. Google Cloud SQL was discussed, Railway favored for lower setup complexity — no infra has been provisioned yet either way.)

**Media storage:** fully migrated from AWS S3 to Firebase Cloud Storage.
- `src/services/uploadService.js` was rewritten around a custom multer storage engine (`FirebaseStorageEngine`) that streams uploads to Firebase via `firebase-admin`; Sharp-based image optimization logic was preserved.
- Bucket: `bhav-bhakti.firebasestorage.app` (`src/config/firebase.config.js`, `.env.example`). Region/location (asia-south1/Mumbai) is a Firebase Console project setting, not stored anywhere in the codebase, so it couldn't be verified from code — treat that detail as unconfirmed until checked in the console. (Likely conflated with the old S3 bucket, which *was* explicitly `ap-south-1`/Mumbai per `S3_SETUP_INSTRUCTIONS.md`.)
- `storage.rules` is deployed exactly as intended — public read, no client writes:
  ```
  allow read: if true;
  allow write: if false;
  ```
  Writes only ever happen server-side via the Admin SDK, which bypasses these rules.
- Service account key: `src/config/firebase-service-account.json` — confirmed present on disk, confirmed listed in `bhav-bhakti-be/.gitignore` (line 6), confirmed **not tracked** by git (`git ls-files` has no entry for it). Safe as of this writing — but re-check this before every commit, since a gitignore only prevents *future* accidental adds, not a `git add -f` or a rule that gets edited out later.

**Auth:** confirmed broken/placeholder, not yet replaced.
- OTPless is wired up in `src/services/otpless.service.js` (real API calls to `auth.otpless.app`), but it's fully bypassed in practice: `SEND_OTP_ENABLED = false` in `src/constant/index.js` short-circuits sending, and `src/facades/auth.facade.js` accepts a hardcoded master OTP (`'123456'`) for **any** phone number, plus a `TEST_NUMBERS` allowlist. Nothing about this is production-safe.
- Firebase Auth (phone OTP + Google login) was the identified replacement direction, but **there is no implementation of it anywhere** — `firebase-admin` is only used for Storage (`getStorage(app)`), never `getAuth`; no `firebase-admin/auth` import exists in the backend; the frontend has no Firebase SDK or Google-login code at all, only calls to the backend's existing phone-OTP endpoints. This is 100% unbuilt, not partially built.

**AWS leftovers not yet cleaned up** (low priority — flag if touching these areas, don't proactively fix):
- `aws-sdk`, `@aws-sdk/client-s3`, and `multer-s3` are still in `bhav-bhakti-be/package.json` dependencies though unused by the live Firebase upload path.
- `scripts/optimize-s3-assets.js` (`npm run optimize:s3`) is a standalone AWS-SDK script, now orphaned since new uploads no longer land in S3.
- `S3_SETUP_INSTRUCTIONS.md` and `scripts/S3_OPTIMIZATION_GUIDE.md` are stale docs from the S3 era.
- `src/controllers/profile.controller.js:518` still branches on URL host string to decide whether to attempt storage cleanup on profile-picture delete:
  ```js
  if (profilePictureUrl.includes('firebasestorage.googleapis.com') || profilePictureUrl.includes('amazonaws.com') || profilePictureUrl.includes('assets.orivori.com')) {
  ```
  Legacy S3/CDN URLs will silently no-op here since `extractKeyFromUrl()` only correctly parses the Firebase key shape.

**Legacy data trap:** some `FeedMedia.mediaUrl` rows imported from old CSVs are still `cloudfront.net` URLs, sitting in the same table as new `firebasestorage.googleapis.com` rows. Harmless for rendering today (the frontend treats every media URL as an opaque string), but don't write future backend logic that assumes every stored URL is Firebase-shaped.

## 3. Content ingestion — known gap

**There is no admin panel, dashboard, or CMS anywhere in either repo.** Confirmed by direct file search — nothing named admin/CMS/dashboard exists in the frontend at all.

Current real-world workflow for adding content is one of:
1. Manual API calls (Postman/curl): `POST /api/v1/upload/media` to get a Firebase URL back, then `POST /api/v1/feed` with that URL in a `media[]` array to create the `Feed`/`FeedMedia` rows.
2. `npm run import:feeds` (`scripts/import-feeds-from-csv.js`) — reads a CSV (exported from a Google Sheet) and inserts `Feed`/`FeedMedia` rows directly via Sequelize, bypassing the API. The CSV itself still instructs the human filling it out to "upload on s3, take url from cloudflare and put here" — i.e. the sheet-based process predates the Firebase migration and hasn't been updated.

**Security note, not urgent right now:** `POST /api/v1/feed` (`src/routes/feed.routes.js:16-23`) has its auth check commented out — `// authenticate, // Commented out for public access` — with a comment saying it was made public "for admin web interface." That web interface was never built, so right now this content-creation endpoint is open to anyone who finds it. Flag as a pre-launch fix, not something to silently patch without asking (removing it will break the current manual-curl workflow until a real admin auth story exists).

**Priority:** a simple, non-technical-friendly content upload tool is a near-term goal. Don't assume this has been built in a future session without checking — confirm with the founder first.

## 4. Frontend display — known gap, re-verify before assuming fixed

**Ringtones: fully wired, working.** `app/(main)/ringtones.tsx` → `RingtonesScreen` → `useRingtones` hook → `feedService.getFeeds()` (filtered client-side for `type === 'ringtone'`) → rendered by `RingtoneFeedCard`, which plays audio via `expo-av`'s `Audio.Sound.createAsync({ uri: audioMedia.audioUrl || audioMedia.mediaUrl })`. This is the one real, testable end-to-end content path in the app today.

**Wallpapers: still broken as of this writing.** The actual "Wallpapers" tab (`app/(main)/wallpapers.tsx`, and `wallpaper-detail.tsx`) imports and renders `mockWallpapers` from `src/data/mockWallpapers.ts` — static hardcoded data, never calls the Feed API. Anything added through the ingestion paths in §3 will **not** appear here.

The only screen currently pulling real `type: 'wallpaper'` Feed data from the API is **"Daily Status"** (`app/(main)/daily-status.tsx`, via `useFeed({ filters: { type: 'wallpaper' } })` → `FeedList` → `FeedCard` → `WallpaperFeedCard`).

Re-confirm this split before relying on it — it's exactly the kind of thing a future session might fix without it being recorded here.

## 5. Horoscope engine

Confirmed: the daily Rashifal feature is not doing real astrological generation. `src/services/horoscopeAPI.service.js` calls two free public third-party APIs (`aztro.sameerkumar.website`, then `horoscope-app-api.vercel.app`) and, if both fail, falls back to `getDefaultHoroscope()` — a hardcoded object of static per-sign strings with a `Math.random()` "lucky number." Separately, `astrology.service.js` does real western zodiac-sign calculation from date of birth, but Vedic details (moon sign, ascendant) are explicitly stubbed as placeholders in the code (`// TODO: Future enhancement - call Vedic astrology API`).

Intended direction: a custom nightly AI-generation workflow to replace the third-party-API-plus-fallback approach. Not yet built — confirm current state before assuming otherwise.

## 6. Known resolved issues (history only — don't redo these)

- **Seeder JSON bug**, fixed and committed: a data seeder crashed because plain strings were being inserted into JSON-typed multilingual columns. Fixed by wrapping values in `JSON.stringify({ en: ... })`. Commit `15c2b0a` — "Fix: update seeder data formatting to use valid JSON structures" — in `bhav-bhakti-be`, touching `src/database/seeders/20260315000001-seed-mantra-categories.js`. Already on GitHub.
- **AWS S3 → Firebase Storage migration**, committed: commit `67c303b` — "Migrate file uploads from AWS S3 to Firebase Cloud Storage" — in `bhav-bhakti-be`. (Cleanup of leftover AWS packages/scripts/docs was *not* part of this commit — see §2.)
- An original infrastructure audit (repo structure, all 20 models, API routing) was done early in the project. It exists as a reference document held by the founder, not checked into either repo.

## 7. Working style / preferences

- Founder is non-technical: always explain *why*, not just *what*, when something requires a decision from them (e.g. hosting choice, auth approach, tradeoffs between doing something quickly vs. correctly).
- Flag security- and cost-relevant issues clearly and promptly (e.g. the open `POST /api/v1/feed` endpoint, the master-OTP auth bypass) — but don't block ongoing work on low-priority cleanup items (AWS leftovers, stale docs) unless asked.
- After completing meaningful milestones, remind the founder to commit to GitHub — and always confirm sensitive files (keys, credentials, `.env`, `firebase-service-account.json`) are gitignored *before* committing, not after.

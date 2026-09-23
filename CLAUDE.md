# Bhav Bhakti — Project Context

*Last verified against actual code/config: 2026-09-18 (see §95 — Push notifications and 4-of-5 Firebase Analytics buckets (Activation/Engagement/Conversion/Retention) shipped to production and merged to master; the Acquisition bucket is deliberately deferred, covered by Play Console already; several Conversion events remain blocked on the still-unbuilt Premium pipeline frontend. See §94 — Observability trio (Crashlytics with Support ID linking, a backend uncaught-exception handler, a frontend error boundary) DONE, CONFIRMED WORKING, shipped as `versionCode` 5. **Still-open items carried forward from earlier sessions, not yet resolved:** §87 — `isPremium` is permanently stuck `false` for every user (the Premium pipeline's frontend, wiring up the already-built `GET /subscription/status`, was never built) — HIGH PRIORITY for the next Premium pipeline session. §90 — Rashifal lucky-number/color variety fix (`temperature: 1.4`) applied 2026-09-14; a probabilistic fix, not a guarantee, so still needs real-world confirmation over time. §85 — the `dev`/`production`/`master` branching workflow is the standing, permanent process for all future work: everyday commits happen on `dev`, `production` receives ONLY specific commits via `git cherry-pick` from `dev` once confirmed tested, real production pushes happen ONLY from `production` (`npm run update:production`), and `master` is updated only by fast-forward merge FROM `production` once confirmed live — see §85 for full detail. This file was condensed again on 2026-09-18 (had grown past Claude Code's ~150k-char limit): §60, §62, §64, §68–§81, §83, §86, §88, §89, §92, and §93 (each fully resolved, with its outcome already restated by a later section, or superseded/stale) were compressed to short pointers below; their full original text is preserved in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`. §1–§59, §82, §84–§85, §87, §90–§91, §94–§95 were left at full detail, either because they're still-open/recently-changed or already-condensed foundational reference material.*

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
- **Confirmed working end-to-end (2026-07-18):** this is no longer just a migrated code path — it was exercised for real. A real audio file was uploaded through the live `POST /api/v1/upload/media` endpoint (not a direct Firebase Admin SDK call), the returned Firebase URL was used to create a Feed via the live `POST /api/v1/feed` endpoint (Feed ID `1`, `type: 'ringtone'`), and the ringtone played back correctly in the app's Ringtones tab. Full path verified: upload → Feed/FeedMedia rows → app playback.

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

**Content management decision — three options being weighed, not yet decided (2026-07-19), pending a discussion with the co-founder.** This supersedes the single "agreed plan" from 2026-07-18, which is now folded in as option (b):
- **(a) Adapt the existing CSV importer for Firebase URLs** — cheapest, ~1-2 hours. `scripts/import-feeds-from-csv.js` already reads `title_hi`/`caption_hi` columns correctly (see §9) and just needs its expected URL format updated for Firebase instead of the old S3/CloudFront convention. Matches the co-founder's established bulk-upload habit from the AWS era. Downside: no editing or deleting after import — mistakes require a direct DB fix.
- **(b) Build a minimal custom admin upload tool** — ~3-5 hours. The original 2026-07-18 plan: a single-page local-only form (file picker, type dropdown, category dropdown populated from `GET /categories?type=`, a title field) that calls the existing `POST /upload/media` then `POST /feed` endpoints in sequence — no new backend functionality needed. Form-based, one item at a time, but includes basic edit/delete unlike (a). The one backend change this needs: gate `/upload/media` and `/feed` behind a simple shared-secret middleware (header/query param checked against an `ADMIN_KEY` env var) — **not** real user auth, since `authenticate` runs through the broken OTPless flow (see §2) and would buy nothing.
- **(c) Adopt Directus as a full CMS** — ~1-2 days. Confirmed compatible with the existing MySQL schema via a full audit: real FK constraints already exist (`Feed→Category`, `Feed→Deity`, `FeedMedia→Feed`, quiz nesting), so Directus can sit on top with no restructuring needed. Offers native bulk CSV import *and* editing/deletion *and* multi-user roles — the most capable option. Costs the most setup time (multilingual JSON fields need per-column interface configuration; role/permission setup to hide PII/analytics tables takes real effort), and requires an ongoing schema-change discipline: structural changes only ever happen via Sequelize migrations in `bhav-bhakti-be`, never through Directus's own Data Model UI, or the ORM and the live DB schema will drift apart.
- **Wallpapers tab fix is blocked regardless of which option is picked** — see §10. Fixing its data source is pointless until a reachability decision is also made (new tab slot vs. a link from Home), so don't treat shipping any of (a)/(b)/(c) as automatically unblocking that fix.

## 4. Frontend display — known gap, re-verify before assuming fixed

**Ringtones: fully wired, working.** `app/(main)/ringtones.tsx` → `RingtonesScreen` → `useRingtones` hook → `feedService.getFeeds()` (filtered client-side for `type === 'ringtone'`) → rendered by `RingtoneFeedCard`, which plays audio via `expo-av`'s `Audio.Sound.createAsync({ uri: audioMedia.audioUrl || audioMedia.mediaUrl })`. This is the one real, testable end-to-end content path in the app today.

**Wallpapers: still broken as of this writing, and now confirmed unreachable too.** The actual "Wallpapers" screen (`app/(main)/wallpapers.tsx`, and `wallpaper-detail.tsx`) imports and renders `mockWallpapers` from `src/data/mockWallpapers.ts` — static hardcoded data, never calls the Feed API. Anything added through the ingestion paths in §3 will **not** appear here. **On top of that, a 2026-07-19 navigation audit (see §10) found no navigation path in the app links to this screen at all** — it's registered in `app/(main)/_layout.tsx` with `href: null` but nothing ever calls `router.push` to it, so fixing its data source alone wouldn't make it visible to any user. **Data-source fix is blocked on a reachability decision (new tab slot vs. a link from Home) — pending, see §3 and §10.** Don't assume either the data fix or a reachability fix is done in a future session without checking. **Note (2026-07-24): a separate "Wallpaper Hub" was built inside `daily-status.tsx` (see §23) with its own Wallpapers sub-tab — that's a different, working implementation and does not use these orphaned files at all. This paragraph still describes `wallpapers.tsx`/`wallpaper-detail.tsx` specifically, which remain unreachable orphans; don't conflate the two.**

The only screen currently pulling real `type: 'wallpaper'` Feed data from the API is **"Daily Status"** (`app/(main)/daily-status.tsx`, via `useFeed({ filters: { type: 'wallpaper' } })` → `FeedList` → `FeedCard` → `WallpaperFeedCard`).

Re-confirm this split before relying on it — it's exactly the kind of thing a future session might fix without it being recorded here.

**Title vs. caption field confusion (fixed 2026-07-18, see §6 for the fix):** the `Feed` type has two separate fields — `title` (multilingual JSON object, e.g. `{"en": "Test Ringtone"}`) and `caption` (a plain string, currently always `null` for anything created via the API or CSV ingestion). Several components were reading `caption` where they meant to resolve `title`. **Open product question, not yet decided:** should `caption` be built out as a real short-blurb/description feature, or removed from the schema entirely since nothing populates it? Don't assume either direction — ask the founder before building on top of `caption` or removing it.

## 5. Horoscope engine

Confirmed: the daily Rashifal feature is not doing real astrological generation. `src/services/horoscopeAPI.service.js` calls two free public third-party APIs (`aztro.sameerkumar.website`, then `horoscope-app-api.vercel.app`) and, if both fail, falls back to `getDefaultHoroscope()` — a hardcoded object of static per-sign strings with a `Math.random()` "lucky number." Separately, `astrology.service.js` does real western zodiac-sign calculation from date of birth, but Vedic details (moon sign, ascendant) are explicitly stubbed as placeholders in the code (`// TODO: Future enhancement - call Vedic astrology API`).

Intended direction: a custom nightly AI-generation workflow to replace the third-party-API-plus-fallback approach. Not yet built — confirm current state before assuming otherwise.

## 6. Known resolved issues (history only — don't redo these)

- **Seeder JSON bug** — fixed, committed (`bhav-bhakti-be` `15c2b0a`): a seeder crashed inserting plain strings into JSON-typed multilingual columns; fixed by wrapping values in `JSON.stringify({ en: ... })`.
- **AWS S3 → Firebase Storage migration** — committed (`bhav-bhakti-be` `67c303b`), confirmed working end-to-end 2026-07-18 (real upload → Feed → app playback). AWS package/script cleanup was *not* part of this — see §2.
- **Feed title/caption field-mismatch bug** — fixed 2026-07-18 (`bhav-bhakti-fe` `4e65b55`): several components (`RingtoneFeedCard`, `FeedCard`'s mantra render, `mantras.tsx`) read `feed.caption` (always null) instead of resolving the multilingual `feed.title` object, showing generic placeholders instead of real content. Fixed to resolve `feed.title[language] || feed.title.en`. `MantraCard.tsx` had the identical bug but is confirmed dead code (never imported anywhere). Open question, still undecided: should `caption` become a real short-blurb feature, or be removed from the schema? See §4.
- An original infrastructure audit and two 2026-07-19 reference documents (a Product Status Report `.xlsx` and a Navigation Map `.html`) exist only as founder-held files outside both repos — not in git, don't assume Claude Code can see them.

## 7. Session state — uncommitted local changes (resolved)

As of 2026-07-22, `bhav-bhakti-fe`'s `git status` was clean — the two previously-tracked uncommitted items (`package-lock.json`'s "unexplained modification," never actually root-caused but confirmed byte-identical to `HEAD`; and `src/shared/config/api.ts`'s hardcoded `10.0.2.2` override) are both resolved (the latter properly fixed in §12). Founder has HeidiSQL installed for direct DB browsing — see §8 for when to use it vs. Claude Code.

## 8. Working style / preferences

- Founder is non-technical: always explain *why*, not just *what*, when something requires a decision from them (e.g. hosting choice, auth approach, tradeoffs between doing something quickly vs. correctly).
- Flag security- and cost-relevant issues clearly and promptly (e.g. the open `POST /api/v1/feed` endpoint, the master-OTP auth bypass) — but don't block ongoing work on low-priority cleanup items (AWS leftovers, stale docs) unless asked.
- After completing meaningful milestones, remind the founder to commit to GitHub — and always confirm sensitive files (keys, credentials, `.env`, `firebase-service-account.json`) are gitignored *before* committing, not after.
- **Founder prefers checking data directly in HeidiSQL for simple lookups** — viewing a table's contents, checking whether a single row exists, eyeballing a value. Only use Claude Code for data questions that require actual code logic, multi-table joins/queries, or scripting (e.g. counting bilingual-field fill rates across several tables, cross-referencing DB rows against what the app code actually does with them). When a request comes in that's really just "what's in this table" or "does this row exist," flag that it could be checked directly in HeidiSQL instead of running it on the founder's behalf by default.
- **Standing operational fact, recurs regularly (originally documented §20):** home WiFi periodically reassigns the laptop a new local IP, silently breaking physical-device testing until `bhav-bhakti-fe/.env`'s `EXPO_PUBLIC_DEV_API_HOST` is manually updated to match. Check via `ipconfig`'s "Wireless LAN adapter Wi-Fi" entry specifically (other entries can show misleading addresses). A full Metro restart is required after any `.env` change (`EXPO_PUBLIC_*` vars inline at bundle time). Expect to repeat this periodically for as long as the manual-IP-override approach is in use — session logs elsewhere just note the IP changed and point back here, rather than re-explaining it each time.

## 9. Localization / i18n — remaining content gaps (original 2026-07-19 audit; mechanism-level findings resolved, see below)

**This section's original system-level findings (three overlapping hand-rolled translation mechanisms; a hardcoded `getLocalizedText()` bug in `audio-player.tsx` that ignored the app's language setting) are resolved — see §54 for the react-i18next migration and §57 for the `getLocalizedText()` fix.** What remains below are content/data gaps the migration didn't touch, last reconfirmed 2026-08-19 (§56).

**Language switcher:** genuinely functional. Now backed by react-i18next for string resolution, with `useI18nStore` (Zustand, persisted to AsyncStorage) unchanged as the single source of truth for language selection. Gujarati/Bengali are hidden from the picker for MVP (only English/Hindi selectable) — the underlying data/mechanism is intact and can be re-enabled via `SELECTABLE_LANGUAGES` in `i18nStore.ts`.

**Quiz question/answer display and the underlying data are genuinely correct and working.** Live DB fill rates confirmed by direct query (2026-07-19): **Deities 20/20 rows fully bilingual**; **Quiz + Questions + Options 100% bilingual** (1 quiz, 5 questions, 29 options, every row has both `en` and `hi`).

**Categories: 49/55 bilingual.** All 55 have bilingual `display_name`. 6 rows are missing a Hindi `description` — the original seed-data categories (ganesh, shiva, durga, lakshmi, hanuman, universal, ids 1-6). The other 49 (CSV-driven) are fully bilingual.

**Gujarati/Bengali: hidden from the picker (see above), but translation coverage is still only ~25% complete underneath.** `src/locales/gu.json`/`bn.json` are ~66 lines each vs. `en.json`'s 281 / `hi.json`'s 246 — missing whole sections (wallpaperDetail, spiritual, auth, premium, horoscope, zodiacSigns, rashiNames, elements, errors, success). All quiz content (questions/options) is typed and stored as `{en, hi}` only, with no gu/bn data at all. Moot for real users today since they can't select these languages, but relevant if they're ever re-enabled.

**Per-user language preference: backend-ready, frontend never wires it up.** `UserProfile.model.js` has a `language` ENUM supporting 10 languages, and `profile.controller.js` already reads/writes it on `GET`/`PUT /v1/user/profile`. But the frontend never calls this — there's still no real "Edit Profile" screen, and nothing anywhere sends a `language` field in a profile update. Language selection remains 100% phone-local (AsyncStorage only) — resets on reinstall or a new device.

**Quiz recommendation — the actual payoff of the quiz — remains completely unbuilt on the frontend, and half-built on the backend.** Reconfirmed still true during §56's Mantra Explorer investigation (2026-08-19): `mantra-quiz.tsx` never calls the existing result-fetching functions (`useSubmitAnswer`, `useQuizResults`); finishing the quiz just fires a generic alert. Backend's `quiz.service.js` still initializes `recommendedMantras` empty and never populates it — the feature's namesake output doesn't exist yet. The quiz promo card was hidden from the Mantra Explorer UI in §56 (not deleted); backend/data are untouched either way.

## 10. Navigation map — screen reachability audit (2026-07-19)

**18 screen files total** (`app/index.tsx`, 2 in `app/(auth)/`, 15 in `app/(main)/` — not counting the 3 `_layout.tsx` route-group files, which aren't screens). **5 have bottom-tab slots**: Home (`index.tsx`), Mantra (`mantras.tsx`), Ringtone (`ringtones.tsx`), Status (`daily-status.tsx`), Rashifal (`horoscope.tsx`) — all defined in `app/(main)/_layout.tsx`. The **"Status" tab routes to `daily-status.tsx`, not `wallpapers.tsx`** — Daily Status is the one screen actually pulling real `type: 'wallpaper'` Feed data (see §4). **Note: since this audit, "Ringtone" was relabeled "Audio" (§21) and "Status" was relabeled "Wallpapers" (§23) — both route names are unchanged, only labels/content changed; the underlying reachability facts below still hold for the specific orphaned files named.**

The complete navigation graph (every `router.push`/`router.replace` call site in the app — no `<Link>` components are used anywhere, and there's no deep-link/`Linking` handling beyond opening OS settings) is documented in a standalone **Navigation Map (`.html`)** reference document kept outside the repo (see §6) — not duplicated in full here to avoid this file drifting out of sync with that document.

**4 of 18 screens (≈22%) are currently unreachable by any navigation path in the app**, confirmed by grepping every navigation call site, not just the tab config:
- **`wallpapers.tsx`** — registered (`href: null`) in `_layout.tsx` but zero navigation calls anywhere target it. See §3/§4 for why this blocks the Wallpapers data-source fix.
- **`wallpaper-detail.tsx`** — only reachable *from* `wallpapers.tsx` (`wallpapers.tsx:77-78`). Since `wallpapers.tsx` itself is unreachable, this screen is unreachable in practice too, even though the code path technically exists.
- **`spiritual.tsx`** — a fully-built screen with its own mock data (`src/data/mockSpiritual.ts`), registered in `_layout.tsx`, but nothing anywhere navigates to it.
- **`zodiac-selection.tsx`** — registered in `_layout.tsx`, but superseded: the Rashifal tab's zodiac grid (`horoscope.tsx:31-35`) navigates straight to `horoscope-detail.tsx` instead, bypassing this screen entirely. Looks like a leftover from before that grid existed.

**`spiritual.tsx` and `zodiac-selection.tsx` are candidates for either linking up or deleting — undecided.** Don't assume either direction in a future session; confirm with the founder. Same caution applies to `wallpapers.tsx`/`wallpaper-detail.tsx`, though those are already tracked as a known gap via §3/§4.

## 11. 2026-07-20 session — Ringtones playback/caching, play count tracking, Trending Now planning

Ringtones caching v1, playback exclusivity, and Trending Now planning — since fully superseded: playback exclusivity/backgrounding rebuilt into the global coordinator (§17), caching mechanism completely rebuilt in §24/25, Trending Now built in §22. Standing reusable practice from this session, still worth applying: an "Audio Content Pre-Work Scoping Checklist" (playback exclusivity/caching/platform/product questions) before building any new audio content type. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 12. 2026-07-21 session — Network fix, visual/design audit, Aarti/Bhajan foundation, Audio hub decided

Network fix (superseded, further fixed §19/20). Visual/design audit's 3 open product decisions are all now resolved elsewhere: Status/Wallpaper merge → Wallpaper Hub (§23); Rashifal date arrows → removed (§42); zodiac emoji icons → removed (§62). Audio hub architecture decided here, built §21. Aarti/Bhajan schema foundation (`'aarti'`/`'bhajan'` type ENUMs, `is_repeatable` column) laid down here, still baseline. Still-open technical debt from this session: no shared `FEED_TYPES` constant exists — adding a new Feed type still means manually updating multiple hardcoded whitelist call sites across the backend, not yet fixed. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 13. 2026-07-21 session (continued) — Audio player redesign, seek bar diagnosed, category duplicate confirmed, Home tap/startup jitter root-caused

Audio player v1 layout — superseded by the YT-Music-style redesign (§57/58). "Ganesh Mantras" duplicate category diagnosed here is moot since the categoryId-based UI was removed entirely in §56. Home tap and startup jitter issues from this session were both resolved later (§25, §47 respectively). **Still-open, not resolved anywhere since:** the seek bar's thumb has no real drag gesture (tap-only `onPress`, no `Gesture.Pan()`) — diagnosed here, never rebuilt; smoothness was later improved (§26) but real click-and-drag seeking still doesn't exist. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 14. 2026-07-22 session — react-native-track-player evaluated and removed

**Decision: use `expo-audio`, not `react-native-track-player`, for persistent/background audio.** `react-native-track-player` (free v4.1.2) was installed, natively configured, tested, then fully removed after hitting a genuine compile-time incompatibility with this project's toolchain (Expo SDK 54 + New Architecture) — confirmed via an actual Gradle build failure (Kotlin nullability mismatch), not just a warning. The only version that compiles against current toolchains, v5/`@rntp/player`, is commercially licensed (€99/mo+) — not viable on current budget. Removal was verified fully clean (native config reverted, rebuild succeeded, `git status` clean). Re-attempt only if budget changes or a free-tier fix ships. **Trade-off to remember for Stories:** `expo-audio` has no built-in queue/playlist concept — multi-episode "queue + autoplay-next" will need to be hand-built on top of it.

## 15. 2026-07-23 session — Animation fix, autoPlay-on-tap fix, Ringtones migrated to expo-audio, USB dev-build crash fix

Animation freeze fix, autoPlay-on-tap fix, and Ringtones' migration to `expo-audio` — all superseded by later rebuilds (per-feedId autoplay refs in §25, coordinator in §17). Standing operational fact, still relevant: after any USB reconnect, run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` (verify via `adb reverse --list`). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 16. 2026-07-23 session (continued) — FeedMedia cleanup, content-rendering map, audio-player migrated to expo-audio, coordinator confirmed as next milestone

`FeedMedia.tsx`'s dead audio code removed; `audio-player.tsx`'s migration to `expo-audio` — historical, now baseline. Mantra card fragmentation flagged here was fully resolved by the shared `MantraFeedCard` in §59. The `player.loop`/`volume`/`shouldCorrectPitch` unsafe-direct-assignment bugs flagged here were resolved indirectly (§28's auto-loop fix, §58's CounterSheet/MoreTargetsSheet rebuild) — standing lesson: always use `expo-audio`'s setter methods (e.g. `setPlaybackRate()`), never direct property assignment, which silently no-ops at runtime despite TS types allowing it. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 17. 2026-07-23 session (continued) — global playback coordinator built and shipped

**Global playback coordinator — done, committed (`3de37e5`), thoroughly tested on-device.** `src/store/playbackStore.ts` (Zustand, deliberately not `persist`ed — it holds live imperative closures bound to a mounted player instance). Two independent slots, not one shared "now playing": `ephemeral` (ringtones) and `persistent` (mantra today, aarti/bhajan/stories later). Hand-off rules: same-mode hand-off (ringtone→different ringtone, or persistent→different persistent feedId) fully stops the outgoing item; cross-mode hand-off is asymmetric — a ringtone preempting persistent content **pauses** it (stays resumable in the mini-player), persistent content preempting a ringtone **fully stops** it (no paused UI to preserve). This two-slot split was a genuine mid-build correction after real device testing showed the original single-slot design made the mini-player vanish on any ringtone tap, instead of showing paused-and-resumable — the intended Spotify/YouTube-Music-like behavior.

**New component `MiniPlayer`** (`src/components/molecules/MiniPlayer/`): rendered as a sibling of `<Tabs>`, reads only the `persistent` slot (a ringtone can never appear here, enforced at the selector level), hidden while already on `/audio-player`. Pause/resume plus an explicit stop/dismiss (✕); tapping the body navigates to the full player.

**Root cause fix:** `RingtoneFeedCard.tsx` now self-registers with the store directly (`registerPlaybackStart`/`clearNowPlaying`) instead of relying on parent-supplied props — this is what gives Home/Search Results real cross-screen exclusivity and stop-on-blur for free, with zero changes to `FeedList.tsx`.

**Important corrected understanding (retroactively fixes §16's structural finding):** `audio-player.tsx`'s persistence-across-navigation was never actually broken — `(main)` is a `Tabs` group and React Navigation doesn't unmount inactive tab screens by default. What the coordinator actually added was *deliberate management* on top of that pre-existing accidental persistence: cross-screen exclusivity, mini-player visibility, and a real explicit stop.

All 7 designed test scenarios (rapid hand-offs, mini-player stop, pause-not-clear on preemption, resume-from-correct-position, mini-player hidden/reappearing correctly around the full player, Home's ringtones stopping on any tab switch) confirmed working on a real device.

**Known, accepted, minor risk, not yet hit:** a `RingtoneFeedCard` could theoretically unmount while still registered in the `ephemeral` slot, leaving a stale `activeControls` reference — a defensive try/catch was recommended, not yet verified needed in practice.

## 18. 2026-07-23 session (continued) — lock-screen/notification controls built, a crash fixed, zero error boundaries found

Lock-screen/notification controls built and a related crash fixed — baseline since. **Still-standing findings from this session, not resolved anywhere since:** this app has zero error boundaries anywhere — any unhandled crash produces a blank white screen with no fallback. Deliberate, still-current scope decisions: `interruptionMode` stays `duckOthers` (audio ducks rather than pauses for calls); no deep-link-to-specific-screen from the notification; iOS entirely out of scope (no native `ios/` project). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 19. 2026-07-23 session (continued) — lock-screen confirmed on a real phone, WiFi issue narrowed, emulator regression root-caused (fixed next session, see §20)

WiFi dev-client connectivity issue narrowed (USB remained the workaround) and an emulator regression found — both fully resolved next session, see §20. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 20. 2026-07-24 session — isDevice fix confirmed, recurring WiFi IP-reassignment documented, an unidentified network error logged

`isDevice` fix confirmed working. The WiFi/IP-reassignment operational note was moved to §8 (still there). The "unidentified repeating Network request failed error" logged this session was most likely the same connection-pool contention bug later diagnosed and fixed in §25/§26, though never explicitly confirmed as the same issue. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 21. 2026-07-24 session (continued) — Audio hub restructure shipped, a real crash found and fixed

Audio hub restructure (Ringtones/Aartis/Bhajans sub-tabs) shipped, since superseded visually by the Audio hub UI overhaul (§60). Standing lesson from the crash fixed here, still applicable: any code that touches an `expo-audio` player instance during cleanup needs a defensive try/catch, since no synchronous "is released" check exists — this crash class recurred at least twice more (§24, §25) in different files. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 22. 2026-07-24 session (continued) — shared deity/trending filter shipped for Ringtones, three trending bugs found and fixed

Shared Deity/Trending filter pattern (`DeityFilterRow`, hub-level filter state, "Others" as a real Deity row) originated here for Ringtones, then reused unchanged for Wallpaper Hub (§23), Aarti/Bhajan (§27), and Mantra Explorer (§56) — this is the standing pattern for any future filterable content type. Three real `GET /feed/trending` bugs found and fixed this session (ignored `type` param, missing pagination, wrong-scope sort) — now baseline, superseded further by §41's window removal. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 23. 2026-07-24 session (continued) — Wallpaper Hub built end-to-end, mirroring the Audio hub pattern

Wallpaper Hub (Status/Thought/Wallpapers sub-tabs) built end-to-end — since had video support and the Viewing Window feature added (§33), then a full UI overhaul (§61). **Still not actioned:** `WallpaperFeedCard`'s `variant` prop (`default` vs `grid-tile`) was built as deliberately temporary scaffolding — founder's stated intent is to eventually unify to one card style everywhere; don't assume this has happened without checking. Real share-destination deep-linking (WhatsApp Status/Instagram Story) and Firebase Analytics remain parked, not started. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 24. 2026-07-27 session — Cache-Control metadata pass for CSV-imported media, persistent player local caching ported from Ringtones, CDN deferred

Cache-Control metadata pass for CSV-imported media (done, still in place) and persistent-player local caching ported from Ringtones (superseded by the same-day caching-sequencing fix in §25). Real CDN (Cloud CDN + load balancer in front of Firebase Storage) was investigated and explicitly deferred — still the right call, revisit once real volume/billing data justifies it (Railway hosting is now live, see §64). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 25. 2026-07-27 session (continued) — First real bulk CSV import validated, a significant cross-content playback bug fixed, caching sequencing fixed, a native connection-pool bug found (fixed next day, §26)

First real bulk CSV import validated; a significant cross-content playback bug (all mantra/aarti/bhajan cards played the same audio) found and fixed; caching-sequencing and a native OkHttp connection-pool bug found — the connection-pool fix itself was built and confirmed the next day, see §26. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 26. 2026-07-28 session — Connection-pool fix built and confirmed, real root cause of icon/seek-bar lag found (a dead decorative animation, not expo-audio), .env IP update

Connection-pool fix — DONE, confirmed on-device, and still load-bearing infrastructure: `expo-audio`'s native `AudioModule.kt` is patched (`maxRequestsPerHost` 5→20) via `patch-package`, captured as `patches/expo-audio+1.1.1.patch` — this patch must survive every `npm install` (reapplies automatically via `postinstall`; confirmed still reapplying cleanly as of §44). Separately, the reported icon/seek-bar lag was root-caused to a fully decorative, fake wave-bar visualizer competing for the JS thread — removed entirely, not optimized. Standing lesson: seemingly-related symptoms can have entirely unrelated root causes — investigate fresh rather than assuming a shared cause. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 27. 2026-07-28 session (continued) — Aarti/Bhajan Audio hub tabs built and shipped, generalized back-navigation fix, Search Results isRepeatable bug fixed

Aarti/Bhajan Audio hub tabs shipped (superseded visually by §60's overhaul) and a generalized back-navigation fix (`returnTo`/`returnParams` passed by every real entry point) — this pattern is still the standing convention used by later screens (§56, §59, §62 reference it directly). The search-only-matches-caption bug found here was fully fixed by the search rebuild in §59. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 28. 2026-07-29 session — Aarti/Bhajan auto-loop fix, full 8-phase queue feature built, two lock-screen items deferred

Auto-loop/restart bug fixed and the full 8-phase Aarti/Bhajan queue feature (Previous/Next, shuffle-ready store, Like/Share, "Up Next" queue sheet) shipped — this queue architecture is what §57's player redesign builds on top of. Of the two lock-screen items deferred here: the skip-button behavior was fixed in §36; the lock-screen title/artwork metadata mismatch was partially addressed in §37/38 and remains open (see §38, kept in full for its still-pending "next real test"). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 29. 2026-07-31 session — Home feed viewport-autoplay: scoped, not built

**Scoped only, not built this session.** Home feed viewport-autoplay (whichever card is 60%+ visible plays, one at a time, universal `AutoplayFeedCard` for all types) was fully planned as a 6-phase build. Built the very next session — see §30. Full original scoping detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 30. 2026-08-01 session — Home feed viewport-autoplay Phases 1-4 built and shipped

**This entire session's work is frontend-only (`bhav-bhakti-fe`) — no backend changes.** Logged here too since this doc is kept mirrored across both repos for a single shared project narrative; `bhav-bhakti-be`'s own `git status` is unaffected by anything in this section.

**Phases 1-4 done, committed, tested on-device** (`fb8b518`, `39e5fc9`). Viewability infra: 60% visibility threshold, one elected card via a 200ms debounce plus a 500ms floor on starting a new player (connection-pool sensitivity, §25/§26) — scoped to Home only via the opt-in `enableViewportAutoplay` flag, `false`/unattached everywhere else.

**Routing expanded to "any feed with media,"** not an audio-only check — video isn't its own `Feed.type` (it's a `FeedMedia.type` value), so this already future-proofs video content with zero further routing changes needed.

**Dual card sizing, both self-measured** (`getItemLayout` dropped for this path only): audio fixed at ~88% of usable viewport height; wallpaper/video sized to match audio cards' width (no longer full-bleed) for visual alignment and a proportionally shorter card/better peek. This also fixed a real pagination-blank-scroll bug — a stale fixed `getItemLayout` estimate (600px/item) badly mismatched the new cards' real rendered height and broke infinite scroll.

**`AutoplayFeedCard` built, replacing the stub:** isolated per-card player (zero `playbackStore` involvement, by design — overlap with the real/persistent player is an accepted trade-off, not a bug), 30s-or-natural-length cap for audio, unbounded loop for video, a manual play/pause overlay, centered 70%-width CTA pills (Listen / Set as Ringtone / Set as Wallpaper) with consistent styling, ringtone-type content sets the ringtone directly rather than opening the full player, a clearly-marked **TEMPORARY** paywall stub (`isPremiumUser = false`) gating all three pill actions, an evenly-spaced Like/Share/Views footer, and a shared `formatCount` utility (K/M abbreviation).

**Confirmed unaffected:** Mantra untouched; Ringtones tab, Mantra Explorer, Wallpaper Hub, and Search Results all confirmed unaffected via `enableViewportAutoplay` staying `false` everywhere except Home.

**Still pending, not yet built:** Phase 6 (on-device hardening pass) — **correction, see §31:** Phase 5 (muted-by-default video + persistent unmute) was actually already built in this same commit set (`soundPreferenceStore` + `AutoplayFeedCard`'s `isMuted`/mute-button wiring), just never flagged as such; it was never actually pending. Real paywall wiring is a separate future task, blocked on an actual payment/entitlement backend that doesn't exist yet.

## 31. 2026-08-01 session (continued) — Phase 5 confirmed already built, app-backgrounding autoplay bug fixed, Wallpaper Hub snap-to-card feed scoped

**This entire session's work is frontend-only (`bhav-bhakti-fe`) — no backend changes.** Logged here too since this doc is kept mirrored across both repos for a single shared project narrative; `bhav-bhakti-be`'s own `git status` is unaffected by anything in this section.

**Phase 5 (muted-by-default video + persistent unmute) confirmed already built alongside Phase 4, not a separate pending phase — §30's "still pending" note was stale.** `soundPreferenceStore.ts` (persisted, `isVideoMuted` default `true`) and `AutoplayFeedCard.tsx`'s `isMuted`/mute-button wiring were both already committed in `fb8b518`/`39e5fc9`, just never flagged as fulfilling Phase 5. Only Phase 6 (on-device hardening) remains from the original plan.

**Real bug found and fixed, committed and pushed (`bhav-bhakti-fe` `a21460b`): leaving Home via in-app navigation correctly stopped autoplay (`useFocusEffect`), but minimizing/backgrounding the app did not.** Fixed by adding an `AppState` listener (mirroring `RingtoneFeedCard.tsx`'s existing pattern) and folding it into the same `isEffectivelyActive` flag that already gates the audio effect, the 30s cap, and video's `shouldPlay` — audio and video both now stop on backgrounding through the same existing code, no separate stop path added.

**Scoped, not yet built: a TikTok/Reels-style snap-to-card feed for the Wallpaper Hub's Status sub-tab** — visual-only (wallpaper/video, never audio), reusing `AutoplayFeedCard` as-is. Key decision: uncropped 9:16 content takes priority over true edge-to-edge sizing — cards are centered/margined to match Home's audio-card width, not full-bleed, though the snap mechanism itself (`pagingEnabled`) still feels clean/edge-to-edge. Snap-scroll area height is calculated dynamically from whatever space remains below the hub's header (title + deity filter row + sub-tab pills), never hardcoded, so it adapts automatically if the header is redesigned later. Changing the deity filter mid-browse resets scroll to the first card. Not started — pick up whenever ready.

## 32. 2026-08-02 session — Status sub-tab Reels-style feed: first attempt reverted, rebuild scoped

**Frontend-only, nothing committed.** A FlatList snap-scroll attempt was built then reverted (FlatList can't guarantee zero adjacent-item bleed, a real architectural limitation) and a `react-native-pager-view` rebuild was scoped as the next attempt — but abandoned, not pursued: §33's auto-looping video grid was the founder's actual chosen direction. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 33. 2026-08-03 session — Wallpaper Hub video support + Viewing Window feature shipped; pager-view rebuild abandoned

**This entire session's work is frontend-only (`bhav-bhakti-fe`) — no backend changes.** Logged here too since this doc is kept mirrored across all three copies for a single shared project narrative.

**Wallpaper Hub video support + new "Viewing Window" feature — DONE, COMMITTED (`c691eda`, `65be4d7`), tested on-device.** Video support added to `WallpaperFeedCard`'s grid (Status/Wallpapers/Thought sub-tabs) — loops silently, muted unconditionally (hardcoded `true`, independent of the shared `soundPreferenceStore`, deliberately not following Home's mute-preference behavior). New Viewing Window feature: tapping a grid tile opens a centered 80%×80% modal (NOT a bottom sheet — deliberately switched from `@gorhom/bottom-sheet` to a plain RN `Modal`, since a floating centered box isn't that library's use case), showing the image/video WITH sound, plus Like/Share/Download reusing the grid's existing handlers via a new shared `useWallpaperActions` hook. Premium-gated via the existing `isPremiumUser` stub pattern — currently hardcoded `true` for testing, will stay that way until the real paywall is built.

**Three real bugs found and fixed during testing:**
1. **Like icon inside the window didn't update in real time** — root cause was a captured data snapshot at tap-time rather than a live lookup; fixed by storing only the `feedId` and deriving current data from the live feed array on every render.
2. **Backgrounding didn't stop playback** — two layered issues: the `AppState` subscription was conditionally gated and never established in time (fixed: subscribe unconditionally on mount), and even once detection worked, nothing was actually calling pause on the video player (fixed: an explicit effect calling `videoRef.pauseAsync()` when `isEffectivelyActive` becomes false).
3. **Download reported false success and silently overwrote files** — root cause was filename collisions (built purely from content IDs, no uniqueness); fixed by appending a timestamp, plus cleaning up the redundant temp file after `MediaLibrary` copies it to the gallery (was leaking storage silently). The same filename/cleanup fix was applied to two other pre-existing call sites with the identical bug (`AutoplayFeedCard`'s Set-as-Wallpaper, `FeedCard`'s generic download) — all three now use a new shared `getMediaFileExtension` utility, replacing a hardcoded `.jpg` that was corrupting downloaded videos into unplayable image-labeled files. Also added a loading spinner to all download buttons for tap feedback, previously silent/no-feedback during the download.

**PAGER-VIEW REELS-STYLE STATUS FEED — ABANDONED, not just deferred.** After two full sessions on the FlatList snap-scroll approach (§32) hit a fundamental architectural limitation (FlatList can't guarantee zero adjacent-item bleed, confirmed via real device testing across multiple fix attempts), the founder made a deliberate product call: the auto-looping video grid (this session's work) is the actual solution going forward, not `react-native-pager-view`. The pager-view investigation/plan from §32 is kept for reference only — not being pursued. `AutoplayFeedCard.tsx` still carries a few unused leftover props (`fixedTotalHeight`, `showTypeLabel`, `showCtaPill`) from that abandoned attempt, sitting harmlessly uncommitted — safe to discard whenever convenient, not currently causing any issue.

## 34. 2026-08-04 session — Real content sharing built (react-native-share)

DONE, COMMITTED, tested on-device (wallpaper/video confirmed; audio branch built but untested, blocked on no thumbnail content, not a code gap) — frontend-only. Replaced React Native's built-in text-only `Share` with `react-native-share`, since it reliably combines a real file + caption in one action on Android. New shared `shareContent(feed)` utility handles downloading the real file with correct MIME type, thumbnail-only sharing for audio, timestamped filenames, an in-flight double-tap guard, and share-count incrementing. Also discarded the leftover pager-view scaffolding props (`fixedTotalHeight`/`showTypeLabel`/`showCtaPill`) from `AutoplayFeedCard.tsx` (the abandoned pager-view plan itself stays documented in §33). Deliberately deferred: content-type-specific caption wording, paywalling the Share button. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 35. 2026-08-04 session (continued) — Lock-screen skip-button root cause found, fix unverified this session

Root cause found (stale prebuilt AAR, not the patched source) and a config fix applied but not yet rebuilt/verified this session. **Fully superseded by §36** (confirmed working next session). Full detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 36. 2026-08-05 session — Skip-button fix DONE, confirmed on a real device; buildFromSource root cause confirmed via dex decompilation

**Skip-button fix — DONE, COMMITTED, CONFIRMED ON A REAL DEVICE** (both notification shade and lock screen). Root cause: `expo-audio` links a prebuilt AAR binary by default instead of compiling from patched source — meaning prior native patches, including §26's connection-pool fix, may never have been in a real tested build. Fixed via `expo.autolinking.android.buildFromSource: ["expo-audio"]`, confirmed via direct dex-file decompilation of the installed APK (not just a successful build) — this also let the connection-pool fix be re-confirmed genuinely working for the first time with real evidence. Final fix: existing seek commands rewired to trigger real skip-next/previous with correct icons (seek-by-10-seconds removed entirely, founder's choice) — an earlier attempt (new skip commands alongside the old seek commands, plus a deep player mount/remount investigation) caused a real regression and was fully reverted first. Full original narrative archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 37. 2026-08-05 session (continued) — Lock-screen/notification skip-vanish bug: two real root causes fixed and confirmed on-device; a new, separate metadata-race finding logged, not yet investigated

**Lock-screen/notification skip-vanish bug — TWO real, distinct root causes found and fixed, tested on-device.** (1) The playback coordinator's same-mode hand-off logic couldn't distinguish "same player instance, new content" from "genuinely different player" — fixed via a stable `instanceId` (React `useId()`). (2) `activateLockScreenControls()` always did a full native session teardown+rebuild on every skip — switched to an already-existing, already-native-exposed lightweight in-place update path (`updateLockScreenMetadata`) that was simply never called. Notification shade confirmed seamless on skip; lock screen improved but left with some rough edges, deliberately not polished further pending more real-world testing. Also added a 30-minute auto-dismiss for a paused lock-screen entry. **New finding logged here, not chased this session:** a genuine timing race where the app's correct metadata displays first on skip, then gets overwritten ~1s later by the audio file's own embedded metadata — investigated next session, see §38. Full original narrative archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 38. 2026-08-06 session — Lock-screen metadata fix: PARTIAL, title confirmed working, artwork gap documented, not fixed

**Metadata mismatch fix (§37's finding) — PARTIAL, committed as-is, not silently presented as done.** Two-part fix built: explicit `MediaItem` metadata (title/artist/artwork) declared at load time from the already-available `contentData`, plus disabling ExoPlayer's `TRACK_TYPE_METADATA` track selection so nothing should compete with it. **Title fix confirmed working via real on-device testing** — though not yet proven against a file with genuinely competing embedded title data; the current test files may simply lack one, so this isn't fully conclusive yet. **Artwork fix confirmed present and compiled but NOT effective.** Root cause: `TRACK_TYPE_METADATA` disables the wrong mechanism — embedded cover art (ID3 `APIC` frames) on local/progressive audio files rides directly on the audio track's own `Format.metadata`, not a separate disableable metadata track, so the disable call never touches it. Committed as-is with this documented honestly rather than presented as fixed — the title win is real progress, the artwork gap is inert (no crash/regression), just not yet closed.

**NEXT REAL TEST, not yet run:** once a genuine thumbnail is uploaded to any track, check whether the app's data or the file's embedded picture wins — that's the honest signal needed before any further work here. If title also gets overridden once tested against a file with real embedded title data, the same root issue applies there too, meaning the title "fix" was untested luck, not a genuine confirmation.

## 39. 2026-08-11 session — App branding: icon, splash screen, display name, package identifier

App branding — DONE, COMMITTED. New app icon/splash screen; display name corrected to "Bhav Bhakti"; package identifier changed to `com.orivori.bhavbhakti` (confirmed safe, nothing tied to the old identifier). Standing gotcha: adaptive-icon artwork needs real margin within the 1024x1024 canvas or Android's shape-masking crops the logo — the safe zone established here is referenced by later icon work (§44). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 40. 2026-08-12 session — Rashifal MVP core built: real AI content, birthdate-collection flow, three real bugs found and fixed

**Rashifal MVP core — DONE, COMMITTED, TESTED ON-DEVICE.** Real Gemini-generated daily horoscope content replaced the dead third-party-API fallback chain (Aztro/horoscope-app-api removed — missing content now fails visibly instead of silently locking in placeholder text). Home's "Today's Horoscope" card collects a birthdate once via a native picker, calculates+saves zodiac sign, then always routes straight to it, never paywalled (the separate 12-sign browsing grid stayed unpaywalled until §42). **Three real bugs found in previously-untested code, all fixed:** a profile API call using a URL that never existed; 8 horoscope routes with `validate` passed uninvoked, hanging forever with no response; and a significant `new Date().toISOString()` UTC/local timezone bug silently serving IST users yesterday's horoscope every night between midnight-5:30am across 6 live call sites, fixed via one shared local-date utility mirrored in both repos. Full original narrative archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 41. 2026-08-12 session (continued) — Trending 7-day window removed, previously undocumented

**DONE, COMMITTED (`a4d16e5`), tested.** `getTrendingFeeds` previously excluded any content older than 7 days for all types except mantras, which already had an explicit carve-out — silently returning empty/sparse trending results for other content types with low, spread-out volume. The `days`/`createdAt` filter is now dropped entirely, so trending ranks across all active content regardless of age, matching mantra's existing behavior. Pre-existing fix from before this session's Rashifal work, unrelated to it — only now being logged here since it was never documented at the time.

## 42. 2026-08-12 session (continued) — Rashifal Phase 4 shipped, premium status stub consolidated

**This entire session's work is frontend-only (`bhav-bhakti-fe`) — no backend changes.** Logged here too since this doc is kept mirrored across all three copies for a single shared project narrative.

**Rashifal Phase 4 — DONE, COMMITTED (`d791560`), TESTED ON-DEVICE.** Paywall gate added to the 12-sign browsing grid (reuses shared premium status, see below); Home's "Today's Horoscope" personal path remains never-paywalled. Date-navigation pill (prev/next arrows) removed entirely from `horoscope-detail.tsx`, matching the today-only MVP decision — full cleanup including now-dead `formatDisplayDate()`, its styles, and the unused `Haptics` import. **All 5 Rashifal phases now complete:** real Gemini-generated content, correct dates, personal + browsing paths, paywall, on-device verified end to end. Full UI/visual design pass remains explicitly deferred, same bucket as the Ringtone/Mantra/Aarti/Bhajan card redesign (§27).

**Premium status consolidated — DONE, COMMITTED (`6b4681d`).** Found 3 separate, disagreeing `isPremiumUser` stubs (`AutoplayFeedCard.tsx`, `horoscope.tsx`, `useViewingWindow.ts` — one was `true`, two `false`) built independently across different sessions, unaware a real, more complete mechanism (`usePremiumStore`, with a full paywall modal already wired to `profile.tsx`) already existed unused. All 3 now read from that shared store. One real, deliberate behavior change: the Wallpaper Hub's Viewing Window gate went from open to closed, matching the correct intended default. New single `DEV_OVERRIDE_IS_PREMIUM` seam inside `premiumStore.ts` for local testing — structurally only one flip point now, not three.

**STILL NEEDED, logged for later:** per-user premium status (not just an app-wide toggle) requires real user accounts (Firebase Auth) and a backend `isPremium` field — neither exists yet, and connects directly to the still-pending real payment/paywall work.

## 43. 2026-08-12 session (continued), RESOLVED 2026-08-13 — Firebase Phone Auth Phases 1-4 built, real numbers confirmed working via reCAPTCHA fallback

**Phases 1-4 — DONE, COMMITTED.** Backend (token verification, find-or-create + session issuance) and frontend (real `signInWithPhoneNumber`/`confirm` flow) both built and confirmed working end-to-end with Firebase test phone numbers. Old `/send-otp`/`/verify-otp` endpoints and OTPless code deliberately left untouched at this point — that was Phase 5's job (§45).

**Real phone numbers — RESOLVED 2026-08-13, both blockers fully diagnosed with sourced evidence, confirmed working end-to-end:** (1) The Android API key's "Android apps" restriction conflicted with Firebase phone-auth's reCAPTCHA fallback (a documented Firebase architectural issue — reCAPTCHA runs in a browser context, incompatible with an Android-app-restricted key) — fixed by relaxing the restriction to "None" while keeping real API restrictions in place. (2) Play Integrity (the primary, preferred verification path) is unavailable for a USB-sideloaded dev-client build **by Google's own design**, not a config gap — a sideloaded APK can't get a recognized App Recognition verdict since Play Integrity only attests apps Google Play itself distributed; the real fix (Play Console internal testing distribution) was deliberately deferred, not pursued now. The Firebase Console's "you must first set up reCAPTCHA" message was a red herring for the separate, optional **reCAPTCHA Enterprise** product — the SDK actually falls back to its own auto-provisioned, zero-setup **reCAPTCHA v2** tied to the project's `firebaseapp.com` domain (also why the SMS shows that domain instead of the app name). **Decision: accept the reCAPTCHA-based flow for all development until closer to real Play Store release**, at which point Play Integrity should start working automatically with no further Firebase-side changes.

**Also this session, unrelated:** `google-services.json` was briefly committed before GitHub flagged its embedded Android API key; investigated and confirmed low real risk (the same key ships in every built APK regardless) — untracked going forward, left in git history by deliberate choice.

Full original diagnostic narrative archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 45. 2026-08-13 session — Firebase Phone Auth Phase 5 shipped: fake OTPless bypass fully removed, all 5 phases complete

Firebase Phone Auth — FULLY COMPLETE, ALL 5 PHASES DONE, COMMITTED, TESTED. The fake OTPless bypass (master OTP `123456`, `TEST_NUMBERS` allowlist, `SEND_OTP_ENABLED`) is fully REMOVED — the app's original auth security hole is closed. Old `/send-otp`/`/verify-otp`/`/resend-otp` routes and `otpless.service.js` deleted outright. Confirmed via real testing: existing pre-Firebase users log into the same account, no duplicates. Real-number sign-in initially routed through Firebase's reCAPTCHA fallback (expected for sideloaded dev builds, resolved automatically once Play Store distribution began — see §81). SMS auto-fill deliberately not pursued (SMS Retriever API deferred; `READ_SMS` ruled out as a real Play Store rejection risk). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 44. 2026-08-12 session (continued) — Dependency drift cleanup, app icon resized

DONE, COMMITTED, TESTED. Ran `npx expo install --check`/`--fix`, updating 6 packages to Expo-recommended versions (patch-level only, no breaking changes; confirmed `expo-audio`'s native connection-pool patch, §26, reapplied cleanly). App icon also resized (still within §39's adaptive-icon safe zone) — both changes verified together on-device.

## 46. 2026-08-13 session (continued) — UI design-system foundation shipped

DONE, COMMITTED, TESTED (frontend-only). Universal background color centralized into `goldenTempleTheme.ts`; Noto Sans Devanagari font properly loaded and made weight-aware (app was previously silently falling back to system fonts for Hindi text); all raw `react-native` `Text` usages converted to the shared `Text` atom, so future design-system changes reach everywhere automatically. Foundational plumbing only — actual visual/design decisions continued as separate per-component work through §60-§62's later UI overhauls. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 47. 2026-08-13 session (continued) — Phone-login → verify-otp navigation flicker resolved, both auth screens redesigned

RESOLVED, COMMITTED, TESTED. A long-standing phone-login→verify-otp navigation flicker fixed via 3 compounding causes (a duplicate toast, missing background color on the auth nav stack, uncoordinated keyboard dismiss timing). Both auth screens also redesigned (real logo, India-only country code, emoji placeholders removed). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 48. 2026-08-14 session — Nav bar + Home quick-links icons: dead CloudFront links replaced with local SVGs

DONE, COMMITTED, TESTED (frontend-only). Dead CloudFront `SvgUri` icon links replaced with local SVGs via `react-native-svg-transformer`; nav bar focused color unified to `#FF6B00`; Home quick-links consolidated into one shared `QuickLinkCard` + `categories.ts`. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 49. 2026-08-14 session (continued) — AutoplayFeedCard restructuring + Home decluttering shipped; peek-spacing regression fixed same session

DONE, COMMITTED, TESTED (frontend-only). `AutoplayFeedCard`'s type label moved to a header row above the media with a "See all" link; card margin bumped 16px→24px; Home decluttered (redundant See-all link and "Today's Horoscope" section title removed). A peek-spacing regression introduced by the new header row was found and fixed the same session (a new `HEADER_ROW_HEIGHT` subtracted from `contentAreaHeight` for both card types, restoring next-card-peek). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 50. 2026-08-14 session (continued) — Feed import duplicate-insert bug found and fixed

FOUND AND FIXED, COMMITTED, TESTED (backend-only). Real, long-standing bug: `import-feeds-from-csv.js` had always unconditionally inserted every CSV row as a new Feed on every run, silently duplicating existing content on every prior import. Fixed via a new `csv_id` column (unique-indexed) — the importer now does find-or-update instead of blind insert. `feeds`/`feed_media` were wiped (test data, safe) and reimported fresh. Also fixed a related thumbnail bug: `transformMediaData()` only ever read the CSV's 4x5 thumbnail column, ignoring a populated 1x1 column. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 51. 2026-08-14 session (continued) — AutoplayFeedCard audio redesign shipped

DONE, COMMITTED, TESTED (frontend-only). New audio layout: blurred background thumbnail, sharp square thumbnail centered, controls row below. `AUDIO_CONTENT_HEIGHT_RATIO` reduced 0.88→0.75 (confirmed the real safe floor against two-card-viewability overlap). Real bug fixed: tapping play after the 30s cap fired silently did nothing — fixed via a shared `getPlaybackCapSeconds()` plus `seekTo(0)` on resume-from-capped. Footer icons restyled (Share swapped to local `whatsapp.svg`). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 52. 2026-08-15 session — Tap-active-tab-to-scroll-to-top shipped across all 5 bottom tabs

**This entire session's work is frontend-only (`bhav-bhakti-fe`) — no backend changes.**

**Tap-active-tab-to-scroll-to-top — DONE, COMMITTED, TESTED on all 5 tabs.** Standard React Navigation pattern (`tabPress` event + `isFocused()` guard), via new shared `useScrollToTopOnTabPress` hook. Home (`FeedList`) and the two hubs' 6 sub-tab-content components converted to `forwardRef` to expose their internal `FlatList`; Mantra/Rashifal use simple local `ScrollView` refs. Hubs share one ref across their 3 sub-tabs safely, since only one is ever mounted at a time. Purely visual scroll-to-top — no data refresh/reorder (that's a separate, deliberately deferred future feature, matching Instagram/Facebook-style feed refresh).

## 53. 2026-08-16 session — TypeScript cleanup pass

DONE, COMMITTED, TESTED. Fixed a real Android inset bug (`search-results.tsx`'s `SafeAreaView` import was from the wrong package); removed the non-functional clipboard-polling OTP auto-detect leftover from the pre-Firebase-Auth era; deleted confirmed-dead screens/exports; fixed a real landmine in `horoscopeService.ts` (10 unused methods were double-unwrapping the API response and would have crashed immediately if ever called — closes the risk for whenever Weekly Horoscope/Compatibility/History/Feedback are eventually built). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 54. 2026-08-17 session — Language/i18n system investigated and migrated to react-i18next: ALL 5 PHASES DONE, COMMITTED, TESTED

**Language/i18n system — FULLY INVESTIGATED, MIGRATED, ALL 5 PHASES DONE, COMMITTED, TESTED.** Full-codebase sweep found 6 overlapping hand-rolled translation mechanisms (2 confirmed dead — `translationHelper.ts`, `languageStore.ts`; 1 the real app-wide language-selection source of truth, `useI18nStore`; 1 content-authoring pattern that correctly stayed separate, inline `{en,hi}` objects like `Feed.title`), plus a previously-undocumented 7th pattern — 5 files resolving UI text via hardcoded `currentLanguage === 'hi' ? ... : ...` ternaries, never touching any dictionary.

**Migrated to react-i18next** via two namespaces (`translation` for the old nested-dot-path-JSON system's content, `player` for the old flat-key audio-player system's content — a flat merge would have silently collided on both having a top-level `mantras` key of different shapes). `useI18nStore` kept completely unchanged as the single source of truth for language selection/persistence; react-i18next is purely the string-resolution engine, bridged via `i18n.changeLanguage()` whenever the store's language changes. All 25 real consumers migrated: 12 files to real `t()`/`ti()` calls (audio-player + player-UI sheets first, then the 8 Mechanism-A screens leaf-to-root, `horoscope.tsx`/`horoscope-detail.tsx` last as the most complex); 13 files simplified to read `useI18nStore` directly, since they only ever needed raw `language` for content-selection, never translation. Confirmed-dead code deleted outright (`translationHelper.ts`, `languageStore.ts`, both old `useTranslation` hooks); `en`/`hi`/`gu`/`bn.json` and `translations.ts` were kept as-is, just repointed as react-i18next resource data — no content rewrite, gu/bn's partial coverage deliberately left unexpanded.

**Additionally:** Gujarati/Bengali hidden from the language picker for MVP (underlying system fully intact — re-enable via the `SELECTABLE_LANGUAGES` constant in `i18nStore.ts`); a language toggle was also added to Home's header.

Full original mechanism-by-mechanism audit and phased migration plan archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 55. 2026-08-19 session — Horoscope English/Hindi content mismatch found and fixed

FOUND AND FIXED, COMMITTED, TESTED with real data. The daily horoscope generator made 24 fully independent Gemini calls (12 signs × 2 languages), so English/Hindi versions of the same sign were genuinely different content, not translations. Fixed via a two-step process: generate once in English, then a separate Gemini call translates that exact content into Hindi (`luckyNumber` copied directly, never re-generated, and retry-safe via always reading the English row back from the DB). Verified on real data. Old, already-mismatched rows were not retroactively cleaned up (acceptable — Rashifal is today-only, no history shown). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 56. 2026-08-19 session (continued) — Mantra Explorer redesign: investigated across 5 rounds, then ALL 4 PHASES BUILT, COMMITTED, TESTED ON-DEVICE

**Mantra Explorer redesign — investigated across 5 rounds of code-reading, live-DB queries, and live-backend calls, then a full phased plan was built and shipped. ALL 4 PHASES DONE, COMMITTED, TESTED ON-DEVICE.**

**Phase 1:** back-button fixed (explicit navigate-to-Home, same pattern already used for `audio-player.tsx` in §27, since `mantras.tsx` is reachable both via tab-bar switch and via real push navigation with back-history); the "Find Your Perfect Mantra" quiz-promo card hidden (single block removed from `mantras.tsx` — route stays registered, quiz backend/data left fully untouched; the quiz's recommendation feature remains unbuilt on both ends, confirmed still true from earlier investigation).

**Phase 2:** the broken `categoryId`-based category-pill grid removed. Root cause, confirmed live against the running backend and the DB: `category_id` is NULL on 100% of feeds app-wide, every content type — the CSV importer only ever writes `deity_id` (100% populated everywhere), never `category_id`, despite the importer's `category_id` logic itself being fully correct and working (the source CSV's `category id` column is simply blank on every real row). Replaced with the full `DeityFilterRow` pattern (Trending-default + primary-deity chips + "More" overflow), reusing the proven Audio/Wallpaper hub approach, plus a new `useMantraFeed` hook mirroring `useAudioFeed`'s trending/deity-branching shape. "Trending" also renamed to "All" app-wide (one shared label in `DeityFilterRow.tsx`).

**Phase 3:** the wallpaper-only `statusOccasion` field renamed to `label` (not `tag`, to avoid confusion with the separate, real-but-dormant `feed_tags` system) and widened from 4 wallpaper-occasion values to 8, adding peace/strength/protection/positivity for mantras — full migration, model, validator, service, controller, CSV-importer (including fixing its wallpaper-only warning guard), and frontend type updates, verified against a real 31-row CSV import with 0 errors.

**Phase 4:** a new "मुझे चाहिए / I am looking for" mood-pill section (2x2 gradient grid, matching Rashifal's zodiac card styling) — tapping a mood randomly selects one matching mantra and opens the player directly, via new `sortBy: random` support added to the shared feed endpoint (no prior DB-level random-selection precedent existed in this codebase; verified genuinely random via live testing). Mantra list cards redesigned: simplified to thumbnail/title/play/like (removed largely-fake artist/stats fields), added a mood label pill (shown only when tagged) and a read-only "currently playing" border indicator. Margin system standardized to `spacing.lg` across Mantra/Audio/Wallpaper hubs, including `DeityFilterRow` itself.

**Investigation also concluded, with reasoning preserved for future reference:** the dormant `categories`/`categoryId` table should NOT be revived as the mood/tag mechanism — it's type-scoped and deity-named (wrong shape for a cross-cutting tag), already functionally redundant with the fully-populated `deityId`, and its sole real UI consumer was the now-removed broken grid. Mantra list ordering (`Feed.order` never populated by the CSV importer, affecting all content types, not just mantras) was explicitly scoped OUT as a separate, unrelated future task, not part of this redesign.

Full original 5-round investigation (schema tracing, live DB/backend evidence, the `statusOccasion`-reuse-vs-new-column tradeoff analysis, and the full phased build plan) archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 57. 2026-08-20 session — Aarti/Bhajan Player Redesign: ALL 6 PHASES DONE, COMMITTED, TESTED ON-DEVICE

ALL 6 PHASES DONE, COMMITTED, TESTED ON-DEVICE. `audio-player.tsx` restructured to a YT Music-style layout (thumbnail → title/artist → Like/Share/Views pills → seek bar → Shuffle/Previous/Play/Next/Repeat → swipe-up-to-open-Queue) with the bottom nav bar hidden immersively. Mantra's control branch deliberately left untouched (own redesign, §58). Two real bugs fixed along the way: title/artist was being silently overwritten by the CSV importer with a copy of the English title (fixed in the player, 3 nav call sites, 2 share-message builders, and the importer); `getLocalizedText()` claimed to check language but was hardcoded to English (fixed to genuinely read `useI18nStore`). Known limitation, not a bug: caption/artist is a single plain-text column, not bilingual like title — can't switch languages without a schema change. The "Up Next" Hindi-label truncation noticed here was a real bug, later root-caused and fixed by §71. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 58. 2026-08-20 session (continued) — Mantra Player Redesign: DONE, COMMITTED, TESTED ON-DEVICE

DONE, COMMITTED, TESTED ON-DEVICE. Controls rebuilt as three equal round buttons (Speed/Play-Pause/Chant-counter), orange Play button kept as the visual anchor; loop-toggle and the Info icon/InfoSheet removed for mantra only (confirmed zero other consumers). `CounterSheet.tsx` fully rebuilt from scratch — the old progress indicator was mathematically broken (could only ever show 50%); replaced with a correct SVG stroke-based arc. New `MoreTargetsSheet.tsx` replaces the old inline "More" picker, fixing a real z-index/portal-layering bug (the old picker rendered behind `BottomSheetModal` content since it wasn't itself portaled). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 59. 2026-08-20 session (continued) — Search: FOUND BROKEN, FULLY FIXED, COMMITTED, TESTED

FOUND BROKEN, FULLY FIXED, COMMITTED, TESTED. Search had regressed to matching only caption/location/feed_tags — empty/unused for every real feed, a side effect of an earlier session's caption repurposing. Fixed: search now matches title (bilingual)/deity name/content-type label, word-split OR logic, ranked by match count; SOUNDEX/typo-tolerance deliberately dropped (broken for Hindi, unnecessary complexity for MVP). Fixed a real navigation bug (search-results.tsx wasn't passing `returnParams`, so backing out of the player landed on a blank search screen). Card fragmentation closed: extracted one shared `MantraFeedCard` used identically by Home/Search/Mantra Explorer; `WallpaperFeedCard`'s default variant given real video support (benefits every consumer, not just search). Home's decorative mic icon replaced with a working search-submit button. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 60. 2026-08-21 session — Audio hub UI overhaul shipped

Audio hub UI overhaul (search bars added to Mantra Explorer/Audio hub; Ringtone/Aarti/Bhajan/Mantra cards restyled for visual consistency across all three feed card types; a broken Set-as-Ringtone "Sound Settings" button fixed) — DONE, COMMITTED, TESTED, still the current look. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 61. 2026-08-23 session — Wallpaper hub UI overhaul, MiniPlayer/audio-player small fixes

DONE, COMMITTED, TESTED. Wallpaper hub UI overhaul (search bar header, restyled sub-tab pills, new `wallpaperHub` i18n namespace); real bug fixed where thought-type content rendered through a generic fallback card instead of `WallpaperFeedCard`. Also: removed a buggy pulsating play/pause animation (a real race condition), MiniPlayer restyled, and a real tab-bar-height mismatch fixed (affected 15 files' bottom padding). The "आगे बजेगा" Up Next label truncation noticed here (unresolved at the time) was later root-caused and fixed by §71. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 62. 2026-08-23 session (continued) — Rashifal UI overhaul

Rashifal UI overhaul (grid + detail restyled to match the app's established design language, zodiac grid simplified, Share swapped to WhatsApp) and a real back-navigation bug fix (back button now respects entry point, via the standing `returnTo` pattern used elsewhere in the app) — DONE, COMMITTED, TESTED. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 63. 2026-08-24 session — Profile section rebuild

DONE, COMMITTED, TESTED. Real Edit Profile screen built (name/gender/DOB, correctly wired to the audited zodiac-calculation path); main Profile screen now shows real user data; non-functional stubs removed (camera upload, phone/email management, social links); Manage Subscription/Terms/Refund Policy stubs added; About Us now reads real app name/version. Notification settings deep-link added but left unconfirmed (deprioritized — push notifications aren't built yet). The two-word Hindi text truncation bug noticed here (QueueSheet, Logout button) was later root-caused and fixed, see §71. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 64. 2026-08-25 session — App hosting

App hosting — DONE, real infrastructure live: backend + MySQL hosted on Railway, full local database migrated over successfully. 3 real deployment bugs fixed (Node version mismatch, Firebase credentials base64 env-var fallback, confirmed local/hosted API env separation). EAS Build connected. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 65. 2026-08-26 session — EAS Update pipeline + real bug fixes

DONE, COMMITTED (20 files). Fixed a critical, months-old Devanagari data corruption bug from the original database migration (mysqldump/PowerShell round-trip mangled UTF-8 into literal '?' characters) — re-migrated cleanly via `--result-file`/`SOURCE`. Fixed a real Android emoji-fallback rendering bug (the shared `Text` atom was forcing `fontFamily: 'System'`). Wired up the previously-stubbed 'Liked' filter across all hubs. Set up EAS Update properly; first real shareable preview APK built and distributed for testing. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 66. 2026-08-26 session (continued) — EAS Update proven, permission audit, Liked-filter crash fixed, horoscope cron automated

DONE. EAS Update pipeline proven working end-to-end (old APK predated `expo-updates`, needed a fresh build; future updates: publish, then close+reopen app TWICE). Full MediaLibrary permission-handling audit + fix across all 5 requests. Real crash fixed: Liked filter crashed on Ringtones/Wallpapers (missing `FeedMedia` include). Horoscope generation fully automated via Railway cron (`TZ=Asia/Kolkata` required — without it, generation silently mislabels every horoscope by a day).

## 67. 2026-08-27 session — Three small fixes: language toggle, mantra counter rework, back navigation

DONE, COMMITTED, TESTED. Language toggle now shows current language, not the switch-to target. Mantra chant counter reworked: removed cross-session AsyncStorage persistence — counter now resets only on a genuine feedId change, correctly preserved across pause/resume via mini-player (fixed a subtle race where a previous track's trailing finish-event incremented the newly-reset counter). Back navigation (hardware button + gesture) now correctly respects `returnTo` logic via `BackHandler`, previously always fell through to Home. (Known-deferred per-user premium status note here superseded by §87's fuller finding.)

## 68. 2026-08-27 session (continued) — route-param URL corruption bug fixed

Real root cause found and fixed for the recurring "check your internet connection"/stuck-spinner audio-loading bug — DONE, COMMITTED (`fd4c43b`), CONFIRMED via live logcat: `useLocalSearchParams()`'s automatic `decodeURIComponent()` was silently corrupting Firebase Storage URLs' own valid percent-encoding when passed through route params; fixed via `encodeURIComponent()` at all 6 navigation entry points into `audio-player.tsx`. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 69. 2026-08-30 session — Audio-player investigation, second half

5 real fixes shipped (Home-launch player leak — `AutoplayFeedCard` was creating 5 real ExoPlayer instances unconditionally on every launch; a stuck-retry gap; wrong caching directory across 6 files + a 14-day eviction sweep; Rashifal's premium paywall removed entirely as a product decision; Hindi nav/card translations) — DONE, COMMITTED, TESTED. The original overnight ExoPlayer-stalling investigation remains genuinely unresolved (needs a native `onPlayerError` listener, deferred). Payment-strategy business/legal scoping (Razorpay UPI Autopay, RBI notification rules) started, no code yet. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 70. 2026-08-31 session — Premium pipeline scoped, Firebase Auth SHA-fingerprint bug fixed, eas.json production profile fixed

Premium/subscription pipeline SCOPED (full plan documented in a separate reference doc, building started §77). Also fixed a real Firebase Auth bug (debug-keystore SHA fingerprints registered instead of the EAS release keystore's, breaking real-number login on the preview APK) and a gap in `eas.json`'s production profile (missing EAS Update channel, unverified image pin) before the first real Play Store submission. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 71. 2026-09-01 session — Recurring Hindi text truncation bug fixed (Up Next, Logout, See-all, header title)

Fixed a real, recurring Hindi text truncation bug affecting 5 locations (Up Next handle, Logout button, both See-all links, Home header title) — root cause was React Native's own text self-measurement failing on Android with the Devanagari font, NOT a space/width constraint (confirmed via real adb uiautomator captures). Proven fix: explicit minWidth/lineHeight/minHeight floors instead of relying on auto-measurement — reusable pattern for any future occurrence of this exact class of bug.

## 72. 2026-09-01 session (continued) — Mantra chant counter attention bubble

Added the mantra chant counter attention bubble (shown to all users, 3x/day cap, 7s auto-dismiss, tap-anywhere-to-dismiss, right-aligned positioning) — feature-discovery nudge ahead of the future chant-counter paywall. DONE, COMMITTED, TESTED.

## 73. 2026-09-04 session — Play Console setup: account cleanup, versionCode bumped

Play Console account-ownership cleanup done; a pre-existing stale zero-install release confirmed safe. `versionCode` bumped to 2 in preparation for the first production build (superseded by later versionCode bumps — 5 in §94, 6 in progress as of §95). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 74. 2026-09-05 session — Real dev/production package identity split, production-push safety script, Play Console upload key reset

Real dev/production package identity split shipped (`com.orivori.bhavbhakti` vs. `.dev`, a genuinely separate Android app with its own Firebase registration/keystore) plus a typed-confirmation, staged-rollout safety script (`npm run update:production`) in front of production EAS Update pushes. Both variants share the same production backend/database (no data sandboxing, see §75). A Play Console upload rejection (an old release locked to an unknown signing key) was diagnosed and a key reset requested — activated live in §80. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 75. 2026-09-05 session (continued) — Test-account data isolation

Test-account data isolation shipped — DONE, COMMITTED: a new `users.is_test_account` boolean column makes the same phone number resolve to genuinely separate `User` rows for `.dev` vs. production logins on the shared backend/database; a composite `(firebase_uid, is_test_account)` unique index replaces a standalone unique constraint, since Firebase issues the same `firebase_uid` regardless of which app signs in. Denormalized `Feed` counters remain a known, accepted shared/cosmetic trade-off (not data corruption). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 76. 2026-09-05 session (continued) — Railway database migration reconciliation, eas update environment-variable gap closed

Railway's `SequelizeMeta` migration-tracking table (never populated — the DB was originally set up via a raw SQL dump, not `sequelize-cli`) safely backfilled and reconciled, then the two new `is_test_account` migrations run against Railway's live database — DONE, confirmed end-to-end on-device. Also closed a real gap where `eas update` doesn't read `eas.json`'s build-profile env blocks, by pinning `--environment production` (non-overridable) into the safety script. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 77. 2026-09-06 session — Premium Subscription Pipeline Chunk 1: credential-free slice built and shipped

DONE: 3 new tables (`subscriptions`/`subscription_events`/`payments`) migrated to Railway and independently confirmed to exist there; `isPremiumNow`'s date-first entitlement formula extracted into a standalone util with 32 passing unit tests; Razorpay SDK installed, `.env.example` scaffolded with 4 placeholder vars. Deliberately not built this session (needed real credentials): the SDK service calls, webhook handler, subscription endpoints, reconciliation job — all built in §78/79 once credentials were in hand. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 78. 2026-09-06 session (continued) — Chunk 2: the full Razorpay webhook handler, built and tested against self-crafted fixtures

DONE, 67 tests passing, zero real Razorpay credentials needed. `POST /api/v1/webhooks/razorpay` built with HMAC-SHA256 signature verification (`app.js`'s `req.rawBody` gap fixed via an `express.json()` `verify` callback), idempotency via `X-Razorpay-Event-Id`, and transactional event-logging + state-sync sharing one `sequelize.transaction()`. `subscription.service.js`'s `syncFromRazorpayEntity` implements the full event-mapping table every webhook event funnels through. Verified for real against Razorpay's test-mode API in §79. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 79. 2026-09-06 session (continued) — Chunk 3: service layer, endpoints, reconciliation job — DONE, verified against Razorpay's real test-mode API

DONE, verified against Razorpay's REAL test-mode API (not fixtures): `razorpay.service.js`, all 3 `/subscription` endpoints (`create`/`status`/`cancel`), the reconciliation job (`scripts/reconcile-subscriptions.js`). Found and fixed a real pre-existing bug where an unset optional env var (`RAZORPAY_PLAN_ID`) would have crashed the entire app at startup, not just one route. A real matching Razorpay Plan was found and reused rather than duplicated. 83 tests passing. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 80. 2026-09-07 session — Play Console upload key now live in EAS production credentials

DONE. `new-upload-key.jks` (from §74's Play Console upload-key-reset process) successfully uploaded as EAS's `production` Android signing credentials, fingerprints confirmed matching exactly what Play Console expects — resolving §74's original upload rejection. A fresh signed build was still needed before the next upload attempt (signing happens at build time, not upload time). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 81. 2026-09-08 session — Real, first-of-its-kind Play Store phone-auth bug: DIAGNOSED, FIXED, AND CONFIRMED WORKING

DIAGNOSED, FIXED, AND CONFIRMED WORKING END-TO-END, COMMITTED (`fe: 60bac85`), shipped in `versionCode` 3. Real, non-test-number OTP login on the app's first genuine Play Store Closed Testing build consistently failed with `auth/session-expired` — root-caused via real device logcat to Android's native SMS Retriever auto-verification (only reachable via genuine Play Store distribution) racing and beating the app's own `confirmationResult.confirm(otp)` call. Fixed by watching both signals via `onIdTokenChanged` and deferring to the visible 6-digit OTP input, plus a related `OTPInput.tsx` paste/focus bug fix. Lesson, still relevant: test-number-based evidence bypasses this entire native path and cannot validate real-number auth behavior. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 82. 2026-09-09 session — Legal documents + account deletion: SCOPED (superseded by §84)

**SCOPED here, then built and confirmed working the same day — see §84 for the shipped result.** Original plan: a shared `LegalDocumentViewer` (WebView-based, full-screen + bottom-sheet modes) for Terms/Privacy/Refund Policy in Profile's menu and for the login/`PremiumPaywall` disclaimer links; a Support ID display derived from `firebaseUid` (needed a small backend addition first, since `firebaseUid` wasn't exposed to the frontend at all); an account-deletion flow via a pre-filled `mailto:`. Full original scoping detail (exact file/line targets, the `react-native-webview` new-dependency gap, wording fixes) archived — see `CLAUDE_ARCHIVE_2026-07-29_full-history.md` if the original reasoning is ever needed again.

## 83. 2026-09-09 session (continued) — Session/auth improvements: SCOPED here, resolved elsewhere

**SCOPED, NOT YET BUILT** here (four items found while investigating login session behavior): (1) the 24h-frontend vs. 10-day-backend expiry mismatch and (2) dead 401-cleanup code in `apiClient.ts` — both picked up and shipped, see §87. (3) No re-auth-check on backgrounding (only on a true cold start) — needs precise scoping, still unbuilt. (4) The backend's real `isNewUser` signal, never read by the frontend for "Welcome Back" personalization — still trivial to add, still unbuilt. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 84. 2026-09-09 session (continued) — Legal documents + account deletion: BUILT AND CONFIRMED WORKING

**BUILT AND CONFIRMED WORKING on `.dev`, tested end-to-end** — supersedes §82's "SCOPED, NOT YET BUILT" status. Shared `LegalDocumentViewer` (full-screen + bottom-sheet modes via `WebView`), wired into Profile's menu, the login screen's disclaimer links, a Support ID display (derived from `firebaseUid`), and the full account-deletion flow — all five originally-scoped pieces now live and tested on-device.

**Six real bugs found and fixed along the way** (Android WebView blank-render inside the animated bottom sheet; an overly loose domain guard; a header text-clipping `lineHeight` bug; a `BottomSheetView` fixed-height layout issue with no prior working precedent in this app; a WebView-vs-sheet gesture conflict; hardware-back-button navigation on both new screens) — each independently diagnosed with real evidence. Full bug-by-bug root-cause detail archived, see `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

**NOT YET in production** — deliberately holding for a future production rebuild once more `.dev`-tested features accumulate, per current workflow (§85). Committed and pushed to `bhav-bhakti-fe`'s `master` (`5b504d3`); backend's `firebaseUid` exposure committed and pushed separately (`bhav-bhakti-be` `8c8a7c0`).

## 85. 2026-09-10 session — NEW, PERMANENT BRANCHING WORKFLOW ADOPTED: dev / production / master

**NEW WORKFLOW, adopted 2026-09-10, following a real production incident on 2026-09-09 that exposed a critical gap: `eas update` ships whatever is physically present in the local working directory at the moment it runs, completely independent of git commit status — meaning uncommitted or unintended code can reach production silently.** That gap is exactly how untested session/auth work reached production that night (see the incident's own live investigation earlier this session — the crash-causing update was bundled from an uncommitted working tree that also, unintentionally, included the already-committed-but-`.dev`-only-tested legal documents feature).

We now use three branches with distinct, permanent roles:

- **`dev`** — our everyday, active working branch. All regular commits, features, and fixes happen here first, tested against our `.dev` app via `eas update --branch preview`.
- **`production`** — a curated branch that ONLY receives specific commits via `git cherry-pick` from `dev`, once something is deliberately confirmed tested and ready to go live. We push to real production ONLY from this branch (`npm run update:production`), never from `dev` directly.
- **`master`** — our trusted, stable baseline. Only updated by merging FROM `production` once something is confirmed working in real, live production. GitHub's default branch stays `master`, deliberately — matching this model, where `master` represents the trusted, stable state, exactly what an outside visitor or fresh clone should see first.

`scripts/confirm-production-update.js` now enforces this at the tooling level — it checks the current branch is genuinely `production` and the working tree is clean before allowing any production push to proceed, refusing with a clear error otherwise.

All three branches were established from a single, correct shared baseline (commit `d0c3d25`, `bhav-bhakti-fe`) on 2026-09-10.

## 86. 2026-09-10 session (continued) — versionCode 4 submitted to Play Console Closed Testing

`versionCode` 4 submitted to Play Console Closed Testing, containing the legal documents/account-deletion feature (§84) — superseded by later versionCode bumps (5 in §94, 6 in progress as of §95). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 87. 2026-09-13 session — Session-expiry sync + contextual login prompt: DONE, CONFIRMED WORKING, live in production and merged to master

**DONE, CONFIRMED WORKING, live in production and merged to master.**

**Part 1:** Fixed the 24h-frontend vs. 10-day-backend session mismatch. Frontend now reads the JWT's own `exp` claim directly (a small, hand-written, engine-agnostic base64url decoder) instead of a hardcoded duplicate constant — immune to future drift. Also fixed the backend (`jwt.util.js`) to preserve the real error type (`TokenExpiredError` vs. `JsonWebTokenError` vs. an unrelated server error) instead of collapsing everything into a generic 401 — a genuine DB hiccup now correctly returns 500, never misreported as session expiry. Verified via a `.dev`-only debug tool using a fabricated token, confirmed the app correctly logs out on a genuinely expired cold-start check.

**Part 2:** Real product decision, worked through carefully: browsing content requires NO login (or gracefully ignores an expired token); only genuine ACTIONS require a valid session. Built a simple, contextual "Your login session has expired, please login again" prompt (reusing the same architecture as the premium paywall — one Zustand store, one modal mounted at the app root) that appears in-place the moment any of these 6 real, confirmed action endpoints returns a genuine 401: like/unlike, download, the Liked filter, profile load, and profile save. Share intentionally excluded (fails silently, since the OS share sheet has already completed by the time that call fires). After re-login, the user returns to exactly the screen they were on, not Home. Deliberately did NOT touch the separate, known `optionalAuth` bug (trending/quiz/category endpoints hard-401 on a stale-but-present token instead of gracefully degrading to guest) — scoped as its own, separate future ticket.

**Real, business-critical gap discovered while investigating premium status interaction:** `isPremium` is currently PERMANENTLY stuck at a hardcoded `false` for every user — `setSubscription()` is never called anywhere in the frontend. A genuine, paying subscriber is indistinguishable from a non-subscriber today. This is NOT related to the 401 fix — it exists because the Premium pipeline's frontend (wiring up the already-built, already-tested `GET /subscription/status`) was never built. **HIGH PRIORITY for the next Premium pipeline session.**

## 88. 2026-09-11 session — Rashifal back-navigation fix: DONE, CONFIRMED WORKING, live in production and merged to master

Android's hardware back button and edge-swipe gesture on `horoscope-detail.tsx` now correctly respect entry point (Home's daily-horoscope card vs. the 12-sign grid vs. bottom-nav tab switch) instead of always falling through to Home — DONE, CONFIRMED WORKING, live in production and merged to master, using the same proven `BackHandler` + `useFocusEffect` pattern already established on `audio-player.tsx`. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 89. 2026-09-11 session (continued) — Auto-verification visible feedback: DONE, CONFIRMED WORKING, live in production and merged to master

A "✓ Verified automatically" banner + input lock now fires the moment Android's background SMS auto-verification (§81) completes, instead of silently waiting for manual typing to reach 6 digits — DONE, CONFIRMED WORKING, live in production and merged to master. A real false-positive bug (the banner firing on every normal manual login too, 100% on `.dev`) was found and fixed same session via an `isVerifyingRef` guard, confined entirely to `verify-otp.tsx`. Deliberately not built: validating typed digits against the real auto-retrieved code (would require migrating off `signInWithPhoneNumber`, too risky a change to an already twice-hardened auth path). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 90. 2026-09-11 session (continued), updated 2026-09-14 — Rashifal variety: SECOND FIX APPLIED, confirmation pending (tonight's cron)

**SECOND FIX APPLIED, confirmation pending (tonight's cron).** First fix helped day-to-day repetition, but a new pattern emerged: different signs converging on identical values (42/43, Teal) on the SAME night. Root cause: temperature was never set on the Gemini call, and the prompt gives the model no sign-specific signal for these 3 fields — both together caused near-greedy convergence. Fixed: `temperature: 1.4` (English generation only, not Hindi translation), removed example time-window values (anchoring risk) and two structurally meaningless instructions (avoid-typical, differ-from-previous — each API call is stateless, can't actually honor either). Caveat: temperature is a probabilistic fix, not a guarantee — check both within-sign and cross-sign variety over the coming days.

## 91. 2026-09-11 session (continued) — NEXT SESSION reminder: pick up the deferred §87 session/auth work — RESOLVED, see updated §87

**RESOLVED 2026-09-13 session — picked up and completed, see §87's updated entry (now "Session-expiry sync + contextual login prompt") for the full shipped result.** The "require login for everything" question originally flagged here as blocking was resolved narrowly rather than needing the all-or-nothing decision this reminder anticipated: browsing stays login-free, only the app's 6 real action endpoints (like/unlike, download, Liked filter, profile load/save) gate on a valid session.

## 92. 2026-09-12 session — Jio network blocking Railway backend: DIAGNOSED AND FIXED

Jio network blocking Railway backend — DIAGNOSED AND FIXED, confirmed on real devices, live in production/master. Real users on Jio couldn't load any app content (a known pattern of Indian ISPs blocking shared PaaS domains like `.up.railway.app`). Fixed via a custom domain (`api.orivori.com`) with an automatic Railway fallback built in. Lesson: use a custom domain for production backends, since shared PaaS domains can be silently ISP-blocked in ways invisible to normal testing. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 93. 2026-09-13 session (continued) — Observability gaps: SCOPED here, all three tasks shipped in §94

**SCOPED here** (prompted by a real question about incident debugging/telemetry): confirmed `NODE_ENV` was leaking raw internal errors on Railway (fixed same session); found a genuine mismatch between the Privacy Policy's crash-reporting promise and zero actual crash reporting anywhere in the app. Three tasks scoped, in priority order — Firebase Crashlytics with Support ID linking, a backend uncaught-exception/unhandled-rejection handler, a root-level frontend error boundary — **all three built and confirmed working, see §94.** SLO dashboards/Grafana/APM explicitly declined as premature for current scale. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 94. 2026-09-15 session — Observability trio: DONE, CONFIRMED WORKING

**DONE, CONFIRMED WORKING.** Crashlytics (with Support ID linking via `setUserIdentifier()`), the backend uncaught-exception handler, and the frontend error boundary — all three tasks scoped in §93 — are now built and tested on `.dev`: a real triggered crash was confirmed appearing in Firebase Console with the correct user identifier attached. Cherry-picked to `production` (`versionCode` 5, submitted to Play Console). Firebase Analytics native module also installed alongside (no `logEvent()` calls yet — deliberately deferred).

Two reference documents created for future sessions: `Bhav_Bhakti_Push_Notifications_Plan.md` (fully scoped, not yet built — needs a native rebuild) and `Bhav_Bhakti_Analytics_Event_Plan.md` (the five-bucket event strategy — Acquisition/Activation/Engagement/Conversion/Retention — not yet implemented).

**Next session:** wire up push notifications and/or the actual analytics `logEvent()` calls, using these two reference docs.

## 95. 2026-09-18 session — Push notifications shipped to production; Analytics 4-of-5 buckets shipped to production

**Push notifications — DONE, CONFIRMED WORKING, live in production and merged to master.** Native install, permission requested right after login (covers both new and existing users via `isAuthenticated`), single all-users topic subscription, custom notification icon (own hand-written config plugin, not `expo-notifications` — avoided a real manifest-merger conflict with `react-native-firebase/messaging` via a `firebase.json` fix), and a first-ever deep-link handler with a validated route allowlist (fixing a real bug where an invalid route opened Expo Router's generic error screen instead of falling back to Home). Foreground notification display deliberately deferred (needs Notifee or similar, real future work post-MVP). Zero custom backend — Firebase Console's own composer/recurring campaigns handle all sending.

**Firebase Analytics — PARTIALLY DONE.** Built and confirmed working (live DebugView testing) across all five funnel buckets: Activation, Engagement, Conversion, Retention, and Acquisition (deliberately deferred, covered by Play Console already). Still remaining: refining event precision once real usage data comes in (e.g., `login_failed`'s raw error codes, `card_rank` position-tracking — deferred, needs real plumbing work), and the still-unbuilt Premium pipeline frontend blocks several Conversion events (`trial_started`, `trial_converted_to_paid`, `subscription_cancelled`) from being real yet — only `paywall_hit` and `upgrade_cta_clicked` are genuinely live today.

## 96. 2026-09-24 session — Railway dev environment provisioned (backend); first security-audit fixes shipped to production

A new Railway **development environment** now exists for the backend (own separate MySQL database, deployed independently from production off a new `develop` branch) — for testing changes before they go live. **Not yet wired up: this frontend's `.dev` app still points at production's backend**, not this new dev environment — switching it over is planned for later, not done this session.

**First batch of security-audit fixes — DONE, CONFIRMED WORKING, live in production on both repos.** On the frontend specifically: JWT/PII data (tokens, phone numbers, full user/request objects) no longer logged unconditionally — `authStore.ts`, `useAuth.tsx`, `apiClient.ts`, `secureStorage.ts` all gated behind `__DEV__`, confirmed clean via a real on-device logcat capture (login + OTP verification, no leaked data), merged through `dev` → `production` → `master`. Backend-side fixes (TLS on the DB connection, HSTS, centralized error-message sanitization) shipped in parallel — see `bhav-bhakti-be`'s CLAUDE.md §96. Full detail in `Bhav_Bhakti_Security_Audit_Plan.md` — this is a pointer/summary, not a repeat of it.

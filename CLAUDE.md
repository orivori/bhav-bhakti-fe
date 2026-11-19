# Bhav Bhakti — Project Context

*Last verified against actual code/config: 2026-11-15 (tenth-pass spot check of branches, versionCode/runtime, models, migrations and where Stories lives; §136–§143 were checked against git when written). Last condensed 2026-11-15 (tenth pass, ~151k → ~75k characters). The full text before every pass, including this one, is in `CLAUDE_ARCHIVE_2026-07-29_full-history.md` (two identical copies: `D:\bhav_bhakti\` and `D:\bhav_bhakti_Claude_docs\`). Condensed before on 2026-07-29, 08-13, 08-20 (twice), 09-10, 09-14, 09-18, 09-29, 10-05 and 10-23. Updated 2026-11-16 for the Stories launch (§147; header, §2 and §10 corrected to match, nothing condensed). Updated 2026-11-17 for the download cost reduction (§149, §150; header pointer and the Stories ad-unit item updated, nothing condensed). Updated 2026-11-19 for the v12 release (§152; header, Still open and Standing rules updated, nothing condensed). Updated 2026-11-19 (late) for the Rashifal ad gate, the Rashifal cron alert rule, push tracking and the Rashifal backend release (§153–§156; header, Still open, §2 and §5 updated, nothing condensed).*

*Where things stand (2026-11-19):* **v12 is live on Play Production (2026-11-19, §152)** — version and OTA runtime **1.2.0**, versionCode 12; frontend `production` = `master` = tag `v12` = `adeeee0`; the `.dev` app is versionCode 7. **Two OTA runtimes are now in use:** v12 phones are on 1.2.0 (what `production` publishes); v9–v11 phones stay on **1.1.0**, whose last code is `1a1c274` (§151, §152). Backend `main` = **`d2201bb`** (2026-11-19 23:49 IST): the **Rashifal ad gate backend is on production with both switches OFF** (`rashifal_unlocks` migrated, §156), on top of `5b57ebb` (Rashifal cron alerts only from 05:05 IST, §154) and `7a1b707` (catalogue story rows, §151/§152). The Rashifal gate app code (§153) and push tracking (§155) are on frontend `dev` only. **Stories are live in production (§147):** §120 phases 1–5, §144 ad-lock, §145 Stories on Home and §146 story page + Home card, with `STORY_LOCK_ENABLED` and `STORIES_HOME_ENABLED` ON. **Newest live in production before that:** §143 AdMob → BigQuery daily sync (Railway `admob_sync`); the Rashifal job retry fix (`main` `039c2b3`, 2026-11-11, §5); §142 v11 + soft update prompt ON + deferred deep link tested; §141 deep link catalog; §140 guest login ON; §138 Taurus/Leo/Scorpio birthdate fix; §134 Home pin; §133 link safety handler + deferred-link probe; §130 A2 ad-unlock backend — **the wallpaper/ringtone ad gate is ON in production** (549 `ad_unlocks` rows by 15 Nov, read-only check); §132 the A3/A4 ad engine (inside v9+ builds).

*Still open:*
- **Rashifal (§153–§156):** **set the Daily_Horroscope cron to `15,45 18-23 * * *` UTC (last run 05:15 IST)** — until then a failed 00:15 run neither retries nor alerts (§154); `.dev` phone test of the gate and push tracking; then the 8 frontend commits to `production` (order in §156) + OTA; only then turn on `RASHIFAL_AD_GATE_ENABLED` (production, with `AD_UNLOCK_ENABLED` already on; never set `RASHIFAL_GATE_MIN_BUILD` there); give the daily push custom data `screen = /(main)/horoscope`, `campaign = rashifal_daily`; register the new event parameters as Firebase custom definitions; delete the 48 TEST readings on dev (§153).
- **Stories follow-ups (§147):** Geeta tags (none created on production); v12 is live (§152) — still to do: the soft update to 12 (`ANDROID_LATEST_BUILD` 12) and, only once v12 is at 100% on Play, the hard update (`ANDROID_MIN_BUILD` 12); use page links in ads only after v12 reaches 100% (the production catalogue already lists the 3 story series with pin_link and page_link, §152); the Ad-Lock plan's §18 cleanup of the Stories Home switch; archive dev test rows 9001/9002. The wallpaper/ringtone ad gate is live on production (§130). `ANDROID_MIN_BUILD` is 11 on production (`minSupportedBuild: 11` in the flags, read 2026-11-15).
- **§87 — `isPremium` is permanently `false` for every user** (the Premium frontend wiring `GET /subscription/status` was never built) — HIGH PRIORITY for the next Premium session. Keep `PREMIUM_GATING_ENABLED` off until real checkout exists (§123).
- **Media Stage 2 paused** (WebP variants, thumbnails, video faststart, §125); expo-image and native crash-symbol upload were planned for "v9" but are still not installed/done.
- **Security audit:** complete except Group 4 step 7 (App Check, skipped) and the Expo SDK 54→57 upgrade (parked, §114); permanent Firebase download tokens accepted as-is (§112). `Bhav_Bhakti_Security_Audit_Plan.md` is authoritative. Deferred findings: §100.
- **Content:** never re-import the stale import sheet (§110/§111); the Feed TEMPLATE CSV's example row points at deleted files (§112); `Content Upload Sheet - Deities.csv` is out of step — never run `create-deities-from-csv.js` on a live database (§110/§118).
- **Product decisions pending:** audio "views" vs "plays" (§113); content-management tooling (§3); link-up vs delete for 3 orphan screens (§10).
- **Docker (§128):** `.dockerignore` excludes `package-lock.json`; the API `Dockerfile`'s `HEALTHCHECK` calls `/health`, which 404s — noted only.
- **Privacy policy text** (draft in the Phase 3 plan doc, §140). v8's update screens keep cut-off Hindi labels (no v8 OTA, §140).
- Smaller: seek bar has no drag (§13); lock-screen artwork test (§38); overnight ExoPlayer stall (§69); "Welcome Back" text hardcoded and no reset-to-Home after a long background (§83); per-user language never sent (§9); search alias laxmi → Maa Lakshmi, cancelled shares counted, English-only Status caption (§118); a downloaded wallpaper won't open (Handoff item 10); `role = 'admin'` not set on any production account (§97).

*Standing rules (detail in the sections named):* **Claude never runs an OTA, dev or production — the founder runs every one (§111). No device or emulator testing unless explicitly asked (§113).** **§85 branch workflow:** everyday commits on `dev`; `production` gets only tested cherry-picks; real pushes only from `production` (`npm run update:production`); `master` fast-forwarded from `production` once live. **Never publish an OTA to runtime 1.1.0 from a branch without guest login** (§139/§142). **Two runtimes (§152):** `production` is 1.2.0 and its OTAs reach only v12 phones; an emergency fix for v9–v11 phones (runtime 1.1.0) needs a branch off `1a1c274` (tag `runtime-1.1.0-final`) — not the `v11-final` tag (`f6a99bd`, six commits older). Frontend CLAUDE.md commits stay on `dev`, never `production`/`master`; backend CLAUDE.md commits stay on `develop` (`main`'s copy stopped at §121, §141).

## 1. Project overview

Bhav Bhakti is a devotional content app: wallpapers, ringtones, aartis/bhajans/mantras, daily horoscopes (Rashifal), and a Home feed of devotional content.

Two sibling repos under `D:\bhav_bhakti` (**not itself a git repo**):
- `bhav-bhakti-fe` — Expo / React Native (Expo SDK 54, Expo Router, TypeScript, Zustand; `expo-audio` for audio, `expo-av` still for video). GitHub `orivori/bhav-bhakti-fe`. Branches `dev` / `production` / `master` (§85).
- `bhav-bhakti-be` — Express / Sequelize (MySQL). GitHub `orivori/bhav-bhakti-be`. Branches `develop` (Railway dev) / `main` (production).

CLAUDE.md exists in four identical copies: `D:\bhav_bhakti\`, both repos, and `D:\bhav_bhakti_Claude_docs\` (read by the Claude app). Keep all four (and both archive copies) in sync.

**Founder context:** solo, non-technical founder; all implementation goes through Claude Code. Explain technical trade-offs in plain language before the founder chooses.

## 2. Backend infrastructure

**Database:** MySQL on Railway (§64), production and a separate development environment (§96). **Local `.env` does not use localhost:** `DB_HOST` points at Railway dev (`metro.proxy.rlwy.net`); production is `shinkansen.proxy.rlwy.net`. **Always check `DB_HOST`, never `NODE_ENV`**; writing scripts enforce this via `scripts/confirm-db-target.js` (§97). Railway builds the API from `Dockerfile` (backup from `Dockerfile.backup`, §99; AdMob sync from `Dockerfile.admob`, §143); `docker-compose*.yml` and the old AWS EC2 guide are unused.
- **21** Sequelize models on `develop` and `main` (`RashifalUnlock` added 2026-11-19, §153/§156): AdUnlock, DailyHoroscope, Deity, Feed, FeedDownload, FeedLike, FeedShare, FeedTag, HoroscopeFeedback, HoroscopeReadHistory, LoginHistory, OTPLog, Payment, RashifalUnlock, StoryUnlock, Subscription, SubscriptionEvent, Tag, User, UserProfile, UserZodiac.
- **58** migration files on `develop` and `main`; all run on both databases (`20261120000001-create-rashifal-unlocks` ran on dev 2026-11-19 and on production 2026-11-19 by the founder, §156). Newest: `20261120000001-create-rashifal-unlocks`. Railway deploys never run migrations: production via `scripts/migrate-production.js` (§104), dev via `scripts/migrate-development.js` (§136) or `railway run` with the dev token.

**Media storage:** Firebase Cloud Storage, bucket `bhav-bhakti.firebasestorage.app`, shared by the `.dev` and production apps (any rules change is live for both). Uploads via `src/services/uploadService.js`; every upload/delete route is admin-only (§97). Feeds store Storage **paths**; every feed response returns V4 signed URLs valid 72 hours (§108). `storage.rules`: deny by default except `get` on `FCMImages/`; `backups/` private (§112). The founder publishes rules in the Console; Claude can't.
- Service account key `src/config/firebase-service-account.json` is gitignored — re-check before every commit. Railway gets credentials from a base64 variable (§64). Current key: §128.

**Auth:** silent guest login on first open (§136/§137) plus Firebase Phone Auth (§43/§45); the backend issues its own JWT (10 days). OTPless and the master OTP were deleted (§45).

**AWS leftovers** (low priority): `S3_SETUP_INSTRUCTIONS.md` is stale. The leftover `AWS_*`/`OTPLESS_*` Railway variables were deleted on 2026-10-23 (§128).

## 3. Content ingestion

**No admin panel or CMS exists.** Content goes in with `npm run import:feeds` (`scripts/import-feeds-from-csv.js`): one sheet (template `bhav-bhakti-be/Content Upload Sheet - Feed TEMPLATE.csv`), `id` and `url` required, Firebase URLs converted to Storage paths, find-or-update on `csv_id` (§50), typed confirmation of the target database (§97). Production imports run through `scripts/import-feeds-production.js` (§141), which also refreshes `deeplink_catalog.csv`; if it prints a catalog warning, or a change skipped the importer (e.g. retiring a feed), run the refresh in §141. Importer rules: §110, §120, §135.

`POST /upload/media` + `POST /feed` exist but are admin-only and unused (no admin account; `POST /feed` hardcodes user 1 as owner, §100).

**Content tooling undecided** (pending a co-founder talk): (a) keep improving the CSV importer; (b) a minimal admin upload form (needs an admin account); (c) Directus over the MySQL schema (schema changes still only via Sequelize migrations). Don't assume any was built.

## 4. Frontend display — content screens

Real Feed data: Home (`index.tsx`, `AutoplayFeedCard`, §30); Audio hub (`ringtones.tsx`, Ringtones/Aartis/Bhajans); Wallpaper hub (`daily-status.tsx`, Status/Thought/Wallpapers); Mantra Explorer (`mantras.tsx`); Search (`search-results.tsx`); full player (`audio-player.tsx`, `expo-audio`). `wallpapers.tsx` is an orphan on mock data — not the Wallpaper hub. `Feed.title` and `Feed.subtitle` are bilingual `{en, hi}`; resolve `title[language] || title.en`.

## 5. Horoscope engine

`scripts/generate-daily-horoscopes-gemini.js`: Gemini generates English (`temperature: 1.4`, §90), then translates that exact content into Hindi (§55). Railway cron with **`TZ=Asia/Kolkata`** (§66) — production service "daily horoscope" (`Daily_Horroscope`), redeployed with every push to `main`. **Since 2026-11-11 (`develop` `8dd7a32` → `main` `039c2b3`):** the job reads today's rows first and fills only what's missing (no API call when all 24 exist; Hindi-only gaps are translated from the saved English), retries 408/429/5xx/network/timeouts up to 4 times (~5/20/60 s), validates each answer before saving, works 2 signs at a time, stops after 3 exhausted calls in a row, forced exit at 25 minutes, and exits 1 whenever a reading is still missing — so a failed night can simply be re-run. **Since 2026-11-19 (`main` `5b57ebb`, §154): missing readings exit 1 only for runs that START at or after 05:05 IST** (earlier runs log "STILL MISSING … will retry" and exit 0; hard faults always exit 1), meant for a 30-minute night schedule. Dev-only switches `GEMINI_BASE_URL`/`HOROSCOPE_TEST_DELAY_SCALE` are refused outside dev/local. `astrology.service.js` computes the western sign from date of birth; Vedic details are still stubbed.

## 6. Known resolved issues (history only)

Seeder JSON (`15c2b0a`: multilingual JSON columns need `JSON.stringify`); S3 → Firebase (`67c303b`); title/caption mismatch (`4e65b55`). `MantraCard.tsx` is dead code. Founder-held reference files (Product Status Report, Navigation Map) are outside the repos.

## 7. Session state — resolved 2026-07-22.

## 8. Working style / preferences

- Explain *why*, not just *what*, whenever the founder must decide.
- Flag security- and cost-relevant issues promptly; don't block work on low-priority cleanup unless asked.
- After milestones, remind the founder to commit; confirm keys, credentials, `.env` and `firebase-service-account.json` are gitignored *before* committing.
- **Simple data lookups** (a table's contents, does a row exist): suggest HeidiSQL instead of running them. Use Claude Code for joins, code logic or scripting.
- **WiFi IP changes** silently break physical-device testing: update `bhav-bhakti-fe/.env`'s `EXPO_PUBLIC_DEV_API_HOST` from `ipconfig`'s "Wireless LAN adapter Wi-Fi" entry, then fully restart Metro (`EXPO_PUBLIC_*` inline at bundle time).

## 9. Localization / i18n

react-i18next (§54) with `useI18nStore` (persisted) as the source of truth; `getLocalizedText()` follows it. English and Hindi only (Gujarati/Bengali hidden via `SELECTABLE_LANGUAGES` in `i18nStore.ts`, ~25% translated). Deities all bilingual. **Per-user language is backend-ready but never sent by the app** — it resets on reinstall.

## 10. Navigation map — screen reachability

21 screen files (`app/index.tsx`, 2 in `(auth)`, 18 in `(main)` incl. `stories.tsx` and `story-series.tsx`, §120; plus `app/+native-intent.tsx`, §133), the same on `dev` and production since §147. 5 bottom tabs: Home, Mantra, Audio (`ringtones.tsx`), Wallpapers (`daily-status.tsx`), Stories (`stories.tsx`); Rashifal (`horoscope.tsx`) is kept and reached from Home. Navigation is `router.push`/`navigate`/`replace` only, plus the notification allow-list (§95). **Unreachable** (`href: null`, nothing navigates there): `wallpapers.tsx`, `spiritual.tsx`, `zodiac-selection.tsx` — link-up vs delete undecided. `choose-start.tsx` is live (Home header link).

## 11. 2026-07-20 — Ringtones playback/caching, Trending planning

Superseded. Still use the "Audio Content Pre-Work Scoping Checklist" (archive) before any new audio content type.

## 12. 2026-07-21 — Aarti/Bhajan foundation

Baseline: `'aarti'`/`'bhajan'` type ENUMs and `is_repeatable`. A shared `FEED_TYPES` constant exists on `develop` only (§120), not on `main`.

## 13. 2026-07-21 — Player redesign, seek bar

**Still open:** the seek bar is tap-only (no `Gesture.Pan()` drag).

## 14. 2026-07-22 — react-native-track-player evaluated and removed

**Decision: `expo-audio`, not `react-native-track-player`.** Free v4.1.2 fails to compile with Expo SDK 54 + New Architecture (Kotlin nullability, real Gradle failure); v5 is paid (€99/mo+). Re-try only if budget changes or a free fix ships. `expo-audio` has no queue concept — multi-episode queue/autoplay is hand-built (as Stories did, §120).

## 15. 2026-07-23 — USB dev builds

After any USB reconnect: `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` (check `adb reverse --list`).

## 16. 2026-07-23 — expo-audio migration

**Lesson:** use `expo-audio`'s setter methods (`setPlaybackRate()` etc.), never property assignment — it silently no-ops.

## 17. 2026-07-23 — Global playback coordinator

`src/store/playbackStore.ts` (Zustand, not persisted — holds live closures): slots `ephemeral` (ringtones) and `persistent` (mantra, aarti/bhajan, stories). Same-mode hand-off stops the outgoing item; a ringtone preempting persistent content **pauses** it; persistent preempting a ringtone stops it. `MiniPlayer` reads only `persistent`, hidden on `/audio-player`. Inactive tabs stay mounted, so the player survives navigation. Minor known risk: a `RingtoneFeedCard` unmounting while registered could leave stale `activeControls`.

## 18. 2026-07-23 — Lock-screen controls

Baseline. `interruptionMode` stays `duckOthers`; no notification deep link to a screen; iOS out of scope (no `ios/` project).

## 19. 2026-07-23 — emulator regression, resolved in §20.

## 20. 2026-07-24 — isDevice fix confirmed; WiFi note now in §8.

## 21. 2026-07-24 — Audio hub restructure

**Lesson:** any cleanup touching an `expo-audio` player needs a try/catch — there's no synchronous "is released" check.

## 22. 2026-07-24 — Deity/trending filter

Origin of `DeityFilterRow` (hub-level filter state, "Others" as a real Deity row) — the standard for filterable content types.

## 23. 2026-07-24 — Wallpaper Hub

`WallpaperFeedCard`'s `variant` prop is temporary scaffolding (founder wants one card style eventually). Share-to-WhatsApp-Status/Instagram-Story deep-linking parked.

## 24. 2026-07-27 — Cache-Control on imported media; CDN deferred until volume/billing justify it.

## 25. 2026-07-27 — first bulk import validated; cross-content playback bug fixed.

## 26. 2026-07-28 — Connection-pool fix

**Load-bearing:** `expo-audio`'s `AudioModule.kt` is patched (`maxRequestsPerHost` 5→20) via `patch-package` (`patches/expo-audio+1.1.1.patch`, reapplied on `postinstall`), compiled from source (§36). **Lesson:** related-looking symptoms can have unrelated causes — investigate fresh.

## 27. 2026-07-28 — Aarti/Bhajan tabs

Origin of the `returnTo`/`returnParams` back-navigation convention every entry point passes.

## 28. 2026-07-29 — Aarti/Bhajan queue (base of §57).

## 29. 2026-07-31 — autoplay scoped (built in §30).

## 30. 2026-08-01 — Home viewport-autoplay (with §31's backgrounding fix)

Built (`fb8b518`, `39e5fc9`, `a21460b`): Home only; the card ≥60% visible autoplays, one at a time (200 ms debounce, 500 ms floor between starts); `AutoplayFeedCard` has its own player (no `playbackStore`), a 30 s audio cap, looping muted-by-default video (persisted unmute, `soundPreferenceStore`); backgrounding stops it via `AppState`. 

## 31. 2026-08-01 — muted-by-default video + backgrounding fix (in §30).

## 32. 2026-08-02 — FlatList snap-scroll Reels feed abandoned (no zero-bleed guarantee).

## 33. 2026-08-03 — Wallpaper Hub video + Viewing Window

Grid tiles loop muted video; tap opens the Viewing Window (80%×80% `Modal`, Like/Share/Download via `useWallpaperActions`). Shared `getMediaFileExtension` for downloads. Pager-view Reels abandoned.

## 34. 2026-08-04 — Real sharing via `react-native-share` (`shareContent(feed)`; captions §116).

## 35. 2026-08-04 — superseded by §36.

## 36. 2026-08-05 — Lock-screen skip fix

**Keep `expo.autolinking.android.buildFromSource: ["expo-audio"]`** (in `package.json`) — without it `expo-audio` links a prebuilt AAR and every native patch (incl. §26) silently stops applying. Lock-screen seek commands = skip next/previous.

## 37. 2026-08-05 — Skip-vanish fix (stable `instanceId` via `useId()`; in-place `updateLockScreenMetadata`; paused entry auto-dismisses after 30 min).

## 38. 2026-08-06 — Lock-screen metadata: PARTIAL

Title fix works (not yet proven against a file with competing embedded title tags). **Artwork fix not effective:** embedded cover art (ID3 `APIC`) rides on the audio track's own `Format.metadata`, which disabling `TRACK_TYPE_METADATA` doesn't touch. **Next real test, not yet run:** upload a real thumbnail to a track and see whether the app's data or the embedded picture wins.

## 39. 2026-08-11 — Branding

Display name "Bhav Bhakti"; package `com.orivori.bhavbhakti`. **Gotcha:** adaptive-icon artwork needs a safe-zone margin in the 1024×1024 canvas.

## 40. 2026-08-12 — Rashifal MVP

**Use the shared `getLocalDateString`, never `new Date().toISOString().split('T')[0]`** (UTC/IST off-by-one).

## 41. 2026-08-12 — Trending 7-day window removed (`a4d16e5`).

## 42. 2026-08-12 — Rashifal today-only; `isPremiumUser` stubs consolidated onto `usePremiumStore` (real status unbuilt, §87).

## 43. 2026-08-12/13 — Firebase Phone Auth Phases 1–4

Backend verifies the Firebase ID token, then issues its own session. `google-services.json` is untracked and deliberately left in git history (same key ships in every APK).

## 44. 2026-08-12 — Dependency drift fixed with `npx expo install --fix`; icon resized.

## 45. 2026-08-13 — OTPless bypass (master OTP, `TEST_NUMBERS`) deleted. SMS auto-fill not pursued (`READ_SMS` risks Play rejection).

## 46. 2026-08-13 — UI design-system foundation; §47–§53 summarised here

UI foundation (background in `goldenTempleTheme.ts`, Noto Sans Devanagari, every `Text` via the shared atom); auth flicker fixed; local SVG icons (`react-native-svg-transformer`, focus colour `#FF6B00`); card header row (`HEADER_ROW_HEIGHT` subtracted to keep the peek); importer duplicate-insert fixed via `csv_id`; audio card (`AUDIO_CONTENT_HEIGHT_RATIO` 0.75 is the floor); tap-active-tab scrolls to top (`useScrollToTopOnTabPress`); TypeScript cleanup.

## 47. auth flicker — in §46.

## 48. icons — in §46.

## 49. card header row — in §46.

## 50. importer duplicates (`csv_id`) — in §46.

## 51. audio card — in §46.

## 52. tap tab to scroll to top — in §46.

## 53. TypeScript cleanup — in §46.

## 54. 2026-08-17 — react-i18next migration (namespaces `translation` and `player`; `useI18nStore` synced via `i18n.changeLanguage()`).

## 55. 2026-08-19 — Horoscope Hindi is a translation of the stored English (retry-safe).

## 56. 2026-08-19 — Mantra Explorer

`DeityFilterRow` + `useMantraFeed`; "Trending" renamed "All"; mood tiles play a random match (`sortBy: random`, `tags=`). Mantra ordering (`Feed.order` never populated) is a separate, unscoped task.

## 57. 2026-08-20 — Aarti/Bhajan player (YT-Music style, nav hidden) and Mantra player (Speed / Play-Pause / Chant counter; `CounterSheet.tsx` SVG arc; `MoreTargetsSheet.tsx` portaled).

## 58. 2026-08-20 — Mantra player — in §57.

## 59. 2026-08-20 — Search

Matches bilingual title, deity name and type label (word-split OR, ranked by match count). Shared `MantraFeedCard`.

## 60. 2026-08-21 — Audio hub, Wallpaper hub, Rashifal and Profile UI overhauls (current look); Edit Profile (name, gender, DOB). The notification-settings deep link was never confirmed.

## 61. Wallpaper hub UI — in §60.

## 62. Rashifal UI — in §60.

## 63. Profile rebuild — in §60.

## 64. 2026-08-25 — Hosting: backend + MySQL on Railway; Firebase credentials via a base64 variable; EAS Build connected.

## 65. 2026-08-26 — EAS Update set up

**Database dumps: use `--result-file`/`SOURCE`, never a PowerShell pipe** (it corrupted Devanagari).

## 66. 2026-08-26 — After an OTA, close and reopen the app twice. **The horoscope cron needs `TZ=Asia/Kolkata`.**

## 67. 2026-08-27 — Hardware back respects `returnTo` via `BackHandler`; chant counter resets only on a real feedId change.

## 68. 2026-08-27 — Route-param corruption

`useLocalSearchParams()` decodes params, breaking Firebase URLs' percent-encoding — every entry into `audio-player.tsx` passes `encodeURIComponent()` (`fd4c43b`).

## 69. 2026-08-30 — Player investigation

Fixed: 5 ExoPlayers on every launch; cache directory + 14-day sweep; Rashifal free for everyone. **Still unresolved:** the overnight ExoPlayer stall (needs a native `onPlayerError` listener).

## 70. 2026-08-31 — Release-keystore SHA fingerprints registered in Firebase; `eas.json` production profile has its update channel.

## 71. 2026-09-01 — Hindi text truncation: the reusable fix

**Pattern:** Android's text self-measurement fails with the Devanagari font (not a width problem). Fix with explicit `minWidth`/`lineHeight`/`minHeight` floors. For a `Button` label (§132): `textStyle` with `flex: 1`, centred, lineHeight/minHeight floor — every new Devanagari `Button` needs it.

## 72. 2026-09-01 — Chant counter attention bubble (all users, 3×/day, 7 s, tap to dismiss).

## 73. 2026-09-04 — Play Console cleanup (with §74–§76).

**Two apps:** `com.orivori.bhavbhakti` and `.dev`, each with its own Firebase registration and keystore; production OTAs only via `npm run update:production` (typed confirmation, staged rollout). `users.is_test_account` + unique `(firebase_uid, is_test_account)` keep `.dev` and production logins separate users (shared `Feed` counters accepted). `eas update` ignores `eas.json` env blocks, so the safety script pins `--environment production`.

## 74. dev/production package split — in §73.

## 75. test-account isolation — in §73.

## 76. migration reconciliation — in §73.

## 77. 2026-09-06 — Premium pipeline backend (Razorpay; §78–§79 here too)

Tables `subscriptions`/`subscription_events`/`payments`; `isPremiumNow` util; webhook `POST /api/v1/webhooks/razorpay` (HMAC via `req.rawBody`, idempotent on `X-Razorpay-Event-Id`, one transaction); `/subscription` create/status/cancel; `scripts/reconcile-subscriptions.js`. Verified in Razorpay test mode. Frontend never built (§87).

## 78. webhook — in §77.

## 79. service layer — in §77.

## 80. 2026-09-07 — `new-upload-key.jks` is EAS's production signing credential, matching Play Console.

## 81. 2026-09-08 — Play Store phone-auth bug

Play's SMS auto-verification beat `confirm(otp)` → `auth/session-expired`; fixed by also watching `onIdTokenChanged` (`60bac85`). **Lesson:** test numbers bypass this native path; they can't validate real-number auth.

## 82. 2026-09-09 — scoped; built in §84.

## 83. 2026-09-09 — session/auth items: see §84's open items.

## 84. 2026-09-09 — Legal documents (`LegalDocumentViewer`, WebView), Support ID from `firebaseUid`, account deletion. **§83 still open:** no reset to Home after a long background; "Welcome Back" on `phone-login.tsx` hardcoded for everyone.

## 85. 2026-09-10 — PERMANENT BRANCHING WORKFLOW: dev / production / master

**Why:** `eas update` ships whatever is in the working directory, regardless of git — that's how untested work reached production on 2026-09-09.
- **`dev`** — everyday branch; all commits land here first, tested on the `.dev` app (`preview` channel).
- **`production`** — receives ONLY `git cherry-pick`s from `dev` once tested. Real production OTAs ONLY from here (`npm run update:production`). `scripts/confirm-production-update.js` refuses any other branch or a dirty tree.
- **`master`** — trusted baseline, only fast-forwarded from `production` once confirmed live; GitHub's default branch.

Backend equivalent: `develop` (Railway dev) → `main` (production); since 2026-11 `develop` is never merged wholesale into `main` (it carries Stories) — commits are cherry-picked.

## 86. 2026-09-10 — v4 to Closed Testing (history).

## 87. 2026-09-13 — Session expiry

The app reads the JWT's own `exp` (matches the backend's 10 days). `jwt.util.js`: expired/invalid → 401, other errors → 500. Central 401 handling since §106/§107 (and guest renewal since §137). **Still open — HIGH PRIORITY:** `isPremium` is permanently `false`; `setSubscription()` is never called; `usePremiumStore`'s stub is seeded from the `enablePremiumSubscriptionUI` flag.

## 88. 2026-09-11 — Rashifal hardware back (`BackHandler` + `useFocusEffect`).

## 89. 2026-09-11 — "✓ Verified automatically" banner on SMS auto-verify (`isVerifyingRef` guard).

## 90. 2026-09-11/14 — Rashifal variety: `temperature: 1.4` (English only) and no anchoring example values; probabilistic, worth watching.

## 91. resolved (see §87).

## 92. 2026-09-12 — Jio blocked `*.up.railway.app`; production uses `api.orivori.com` with an automatic Railway fallback. **Lesson:** production backends need a custom domain.

## 93. 2026-09-13 — Observability scoped; built in §94.

## 94. 2026-09-15 — Observability

Crashlytics with the Support ID (`setUserIdentifier()`), backend uncaught-exception/unhandled-rejection handler, root error boundary. Crashlytics custom keys `ota_update` (short tag) and `ota_update_id`, set in `app/_layout.tsx` (§125). SLO dashboards/APM declined as premature.

## 95. 2026-09-18 — Push notifications + Analytics

One all-users topic; notification icon from a hand-written config plugin (a `firebase.json` fix avoids a manifest clash with `react-native-firebase/messaging`); deep links go through a validated route allow-list (invalid → Home); foreground display deferred; sending from Firebase Console. Since §137 the permission dialog is asked once after a first qualifying action. Analytics: 4 of 5 buckets live; Premium conversion events wait for the Premium frontend.

## 96. 2026-09-24 — Railway dev environment; first audit fixes

Dev environment with its own MySQL, deployed from `develop`; `.dev`'s `development` variant uses `api-dev.orivori.com`. Live: TLS to the database, HSTS, `ResponseHandler.errorSafe()` (no raw exceptions to clients), no JWT/PII in frontend logs.

## 97. 2026-09-24 — Audit Group 2 (Access Control), live

`requireAdmin` on all upload routes and `DELETE /upload/media/:key`; Facebook OAuth removed; forgeable `admin.auth.middleware.js` deleted; `POST /profile/photo` removed (a real hole). **`scripts/confirm-db-target.js`:** labels the target PRODUCTION/DEVELOPMENT/LOCAL/UNKNOWN from `DB_HOST`, requires typing the label, refuses non-interactive runs — update its host map (and §141's `KNOWN_DB_HOSTS`) if Railway regenerates a proxy hostname. Production `JWT_SECRET` was the `.env.example` placeholder — rotated (again in §128). Still open: no production admin account (deliberate).

## 98. 2026-09-24 — Audit Group 3 (Rate Limiting), live

All in `src/middlewares/rateLimit.middleware.js`: login 20/min **and** 75/hour per IP; `POST /subscription/create` 5/hour per user; Razorpay webhook 100/min per IP; one shared 300/min per-IP content budget (feed, horoscope, deities, feature-flags; mounted before route auth); `/profile/*` 20 writes/15 min, 30 reads/min. Every 429 is `{ success: false, message }` and logs `[rate-limit]`. Login/content limits are loose on purpose (Jio/Airtel CGNAT). **`trust proxy` is `2`** (`src/app.js`, Railway's two relays; edge discards client `X-Forwarded-For`) — **change it if a CDN/proxy is ever put in front of `api.orivori.com`.** Malformed JSON → 400. Counts live in memory: reset on deploy, not shared across instances (would need Redis).

## 99. 2026-09-24 — Audit Group 5 (Backups), live

Production-only Railway cron (`db_backup`, auto-deploy off) runs `scripts/backup-database.js` daily 3am IST (`30 21 * * *` UTC): `mysqldump` → gzip → Storage `backups/YYYY-MM-DD-HHmm.sql.gz` → retention (newest per day for 7 days with backups + newest per week for 4 weeks, ≤~11 files; count-based; deletes only after a successful upload; ignores non-matching names; `src/utils/backupRetention.util.js`). Logs one `[db-backup] SUCCESS …` or `FAILED stage=…` line; failures exit 1. `Dockerfile.backup` is built on `mysql:9.4` + Node (Alpine's MariaDB `mysqldump` can't log in to MySQL 9) — **bump the tag if Railway's MySQL is upgraded**; it connects only via the private host. `backups/` must stay private in `storage.rules`. Restore verified on dev. **`Dockerfile.backup` copies a hand-picked file list — any new `require` in `firebase.config.js` must be added to it (§128).**

## 100. 2026-09-24 — Audit Group 9 (Adversarial), 2 fixed / 2 deferred

Fixed and live: `POST /feed` now `authenticate` + `requireAdmin` (`bfb3a51`, `1ca0f5e`). **Deferred (MVP, founder decision):** (1) Firebase ID-token reuse within its hour opens new 10-day sessions — fix: reject tokens whose `auth_time` is more than a few minutes old; (2) Razorpay webhook replay with a new event-ID header — fix: dedupe on a raw-body hash and/or ignore events older than the last applied (no money impact). Dev's `RAZORPAY_WEBHOOK_SECRET` differs from local `.env`'s.

## 101. 2026-09-25 — Mantra quiz removed end to end (4 tables dropped; content backed up at `bhav-bhakti-be/archive/mantra-quiz-content-backup-2026-09-25.json`).

## 102. 2026-09-26 — Feeds schema redesign built on dev (see §104).

## 103. 2026-09-26 — `label` retired (see §104).

## 104. 2026-09-26 — Feeds schema redesign, live

**`D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Feeds_Schema_Redesign_Plan.md` is the source of truth for feeds, tags and the importer.** `categories` retired; `label` replaced by `tags`/`feed_tags` (filter `tags=` / `excludeTagGroup=`, e.g. the Wallpapers tab uses `excludeTagGroup=occasion`); `feed_media` merged into `feeds` (Storage paths, bilingual `subtitle`). A request still sending `label` gets **400** by design. App reads fields via `src/utils/feedFields.ts`. **Production migrations only via `scripts/migrate-production.js`** (production-only, typed `PRODUCTION`, mandatory `--to`).

## 105. 2026-09-26 — promotion re-verified against git.

## 106. 2026-09-27 — Audit Group 4 steps 2, 5, 6, 9; central 401 handling (§107 = the production promotion, `43f2ba7`/`7c353e5`, `6f687c8`)

- **Premium gate (step 2):** backend `checkMediaAccess`/`requireMediaAccess`, frontend `authorizeMediaAction` called first by every download/share/view path. Live but **off** (`PREMIUM_GATING_ENABLED` unset; since §130 `AD_UNLOCK_ENABLED` decides instead when on). `authorizeMediaAction` stops on 401; fails open only on no network, timeout, 5xx, 404.
- **Step 5:** `authenticate` on every feed-serving endpoint (only the `view`/`play` counters are open). Live-verified: `/feed*` → 401 without login; `/deities` and `/api/v1/health` 200; bare `/health` 404.
- **Step 6:** the 300/min limit stays; anonymous Storage listing was closed instead.
- **Frontend:** every 401 handled once centrally (`apiClient` → `src/shared/services/sessionExpiry.ts`); React Query doesn't retry a 401. Since §137 a 401 renews a guest session instead of prompting.

## 107. 2026-09-28 — step 5 + 401 handling live (frontend first, then backend) — in §106.

## 108. 2026-09-28 — Signed URLs (Group 4 step 8), live

Every feed response returns V4 signed URLs (`storage.googleapis.com/...?X-Goog-Signature=...`) for `url`/`thumbnailSquareUrl`/`thumbnailPortraitUrl`, valid **72 hours** (`SIGNED_URL_TTL_MS`, `src/utils/feedMedia.util.js`; `version: 'v4'` explicit — V2 has no expiry ceiling). Minted at feed-listing time (autoplay needs them); `applyMediaFields`/`serializeFeed` are async (guarded by `feed.service.serialize.test.js`). The ~208 permanent Firebase download tokens were **not rotated** (accepted, §112). Side effect: images (plain RN `Image`, cached by URL) re-download often; audio is cached by feed ID; videos aren't cached (§125). Day-stable signed URLs (B1) postponed.

## 109. 2026-09-29 — Meta (Facebook/Instagram) SDK, live

`react-native-fbsdk-next`, configured for the production package only. Events client-side, no parameters/PII: install/app-open, `login_success`, `fb_mobile_complete_registration` (literal string) only when `isNewUser`. More events since §134. Only Play App Signing key hash (Meta) and SHA-1 (Firebase) remain registered. Plan: `Bhav_Bhakti_Meta_SDK_Plan.md`.

## 110. 2026-09-29/30 — Storage reorganized, 173 live feeds

- **Khatu Shyam = deity 22** (both databases).
- **Storage layout:** `Audio/<kind>/<Deity or miscellaneous>/` (`aartis`, `bhajans`, `mantras`, `mantras-extended`, `chalisa`, `ringtones`) — capital `A`; sheet paths must match exactly. Wallpapers under `Wallpapers/Static wallpapers/…`; only feeds 30/31 (videos) still in `other/`.
- Import side effects: every `subtitle` empty; feeds owned by user 2 (`DEFAULT_USER_ID`); Chalisas imported as `bhajan`.
- **Validate before importing:** the importer commits every good row even if others fail (bad tag, missing file or a type change drops that row silently), saves an unknown `type` as `general`, skips a title-less row without counting an error, and doesn't check that files exist. **On `main` (production), a blank or missing `views_count`/`likes_count` still resets a live counter to 0 on update** (rechecked 2026-11-15); only `develop`'s importer leaves counters alone (§120).
- **Never re-import the old import sheet** (rows 1–8 still `other/…`, deleted duplicates, old titles) — regenerate from production or use the 2026-09-30 export (§111). Production import runs per §141.

## 111. 2026-09-29/30 — Weighted feed ranking, live; OTA rule

- **Dev feed ids ≠ production's — match across databases by `csv_id`.** Re-import source: `D:\bhav_bhakti_Claude_docs\archive\2026-09-29-content-migration\production-feeds-export-2026-09-30.csv`.
- **Tables** (migration `20260930000001`; plain SQL in `src/services/feedRanking.service.js`): `feed_weight_config` (`factor`, `target_key`, `weight`; seeded media_type audio 1 / image 2 / video 3; deity by `deities.name` — ganesha, shiva, hanuman, rama, krishna 2, durga 1.5; else 1) and `feed_campaign_overrides` (`name`, `target_type` deity/media_type/type/tag, `target_key`, `multiplier`, `start_at`/`end_at`, `active` default 0). Campaign windows are **IST wall-clock**, compared against `getIstDateTimeString()` (never MySQL `NOW()`); start inclusive, end exclusive; overlaps multiply; invalid rows count as neutral and log `[feed-ranking]`.
- **`GET /feed?sortBy=weighted&seed=…`** (seed 1–64 of letters/digits/`-`/`_`; none → one per user per IST day): Efraimidis–Spirakis `u^(1/weight)`, weight = media-type × deity × campaigns (`buildFactors()`); `mixRuns()` keeps ≤2 in a row of the same media type or deity; signed URLs only for the returned page. App: `src/utils/feedSeed.ts`, one seed per scroll session (Home, Thought, every hub chip). `GET /feed/trending` serves only Mantra Explorer's "All" and old installs.
- **Tuning in HeidiSQL, effective next request:** edit `feed_weight_config.weight`, or add a campaign: `INSERT INTO feed_campaign_overrides (name, target_type, target_key, multiplier, start_at, end_at, active) VALUES ('Janmashtami', 'deity', 'krishna', 5, '2026-09-04 00:00:00', '2026-09-06 00:00:00', 1);` (deities by `deities.name`, tags by `tags.key`; a typo silently counts as 1×). Lower the `image` weight if Home feels too visual. Loads the whole library per request — revisit in the thousands. Deferred: time-of-day boost, pin mode, deity cooldown, single-feed campaigns.
- **Standing rule (founder, 2026-09-30): Claude never runs an OTA — not `.dev`, not production.** Claude commits/pushes, then hands over the command and a before/after checklist. Dev (from `bhav-bhakti-fe` on `dev`): `$env:APP_VARIANT = "development"; npx eas-cli@latest update --channel preview --message "..."; Remove-Item Env:APP_VARIANT`. Production: `npm run update:production` from a clean `production`, then `npm run update:production:complete-rollout`.

## 112. 2026-09-30 — Home fixes; Storage cleanup; `storage.rules` locked (Group 4 now 9 of 10)

- **Lesson: drive expo-av video imperatively (`pauseAsync()`/`playAsync()` via a ref) for background behaviour, never through `shouldPlay`** — the global `staysActiveInBackground: true` (`app/_layout.tsx`, leave it) disables expo-av's own pause.
- Audio card: title → thumbnail → play + CTA; `MAX_THUMBNAIL_SIZE` 0.66 of width.
- Lowercase `audio/` and unused `other/` files deleted (backup of 3 unique files in the content-migration archive folder).
- **Rules locked:** deny by default except `get` on `FCMImages/`; signed and tokened links and the Admin SDK still work; bare `?alt=media` links 403. Test rules in the Storage emulator (`npx firebase-tools emulators:exec`, demo project, Java 21 from `D:\Android Studio\jbr`) because both apps share the bucket. App Check skipped, token rotation dropped (founder).
- **Access:** Claude may run read-only production database checks with `RAILWAY_TOKEN_PROD` (`railway run --service MySQL`, SELECT-only script that refuses outside production). Production writes need typed-confirmation scripts and an explicit go-ahead.

## 113. 2026-10-01 — Player fixes, live

- Every autoplay entry sends a fresh `playRequestId` (`src/utils/playRequest.ts`); the player acts once per request (`lastHandledPlayRequestRef`), ignoring a request for the track already playing/loading. The player drops a queue whose current item isn't the opened track; Up Next needs a queue of 2+.
- **Lesson: never `dismiss()` a `@gorhom/bottom-sheet` BottomSheetModal that may never have been presented** — 5.2.14 sticks in DISMISSING and ignores later `present()`.
- **Pending product decision — "views" vs "plays":** audio views count up to 3× per tap; `feeds.plays_count`/`POST /feed/:feedId/play` exist but only `AutoplayFeedCard` calls it and `playsCount` is never shown. Open: what counts as a play?
- **Standing rule (founder, 2026-10-01): no default device testing.** Emulator/device only when explicitly asked; the founder tests and Claude hands over the OTA command + checklist. The local `Pixel_10` emulator has `.dev`; never write the Firebase test number into docs or commits.

## 114. 2026-10-01 — Audit Group 7 (dependencies), live

Backend `npm audit fix` (`firebase-admin` 14.5 → `@google-cloud/storage` 8.2, **needs Node ≥ 22**), `sharp` 0.35.5, AWS packages removed. Frontend JS-only updates (`axios` 1.20.0). **Expo SDK 54→57 parked** as its own project (`expo-av` gone in SDK 55, 266-line `expo-audio` patch to re-port, store build needed). `.npmrc`'s `force=true` removed (`legacy-peer-deps=true` stays). **Before any frontend OTA, diff the lockfile for native packages.** Testing admin routes on dev: temporarily set dev user 30 to admin via a dev-only script, mint a 10-minute JWT inside `railway run -s bhav-bhakti-be -e development` (never print `JWT_SECRET`), clean up, restore `role = 'user'`. Check deploys with `railway deployment list -s bhav-bhakti-be -e development|production`.

## 115. 2026-10-01 — Downloads album; back button

Wallpapers save to a "Bhav Bhakti" album (`Pictures/Bhav Bhakti/`, `src/utils/saveFeedToGallery.ts`) as `bhav_bhakti_<feedId>.<ext>` with an "Already saved" check (can't read the gallery on Android 13+ since §122). **Rule: inside `(main)`'s Tabs, never `router.replace` to a different tab — use `router.navigate`** (expo-router 6.0.24's `tabRouterOverride` drops Home from history). `replace` is fine across navigators or to re-target the same route.

## 116. 2026-10-01 — Shares

`PLAY_STORE_URL` (`src/shared/config/appStoreLink.ts`, always the production listing). `shareContent()`'s `buildShareCaption(feed)`: mantra/aarti/bhajan/ringtone send a translated caption + the **thumbnail, never the audio**; wallpaper/thought/video send the file with "Shared via Bhav Bhakti — {link}". Player and cards all use `shareContent()` (option `onShareRecorded`). Rashifal shares a one-line `horoscope.shareCaption`.

## 117. 2026-10-05 — Maintenance-mode kill switch; About tag, live

**How the switch works** (also in `Bhav_Bhakti_Immediate_Plan_2026-09-30.md`):
- Railway → right environment → `bhav-bhakti-be` → Variables. **On:** `MAINTENANCE_MODE` = `true` (only `true`, trimmed, any case); optional `MAINTENANCE_MESSAGE` (≤300 chars, shown under the built-in translated title/body — write specifics like "Back in about 30 minutes"). The service redeploys; variables are read at startup.
- **Verify** `GET /api/v1/feature-flags` shows `"maintenanceMode":true` (`https://api.orivori.com/api/v1/feature-flags`, dev `https://api-dev.orivori.com/api/v1/feature-flags`). **Off:** delete the variable or set `false`, redeploy, re-check.
- App: checks on cold start (splash held ≤1 s), re-checks on foreground at most every 5 min, Retry button; `MaintenanceScreen` replaces the whole navigator (back exits the app; deep links/notifications ignored; paywall and login prompt not mounted). Failed checks fail open. Only builds with this update react; useless if the backend is fully down.
- `GET /feature-flags` has no `optionalAuth` (never touches the database) — per-user flags would need it back.
- **About:** `Bhav Bhakti v<version> (xxxxP)` = last 4 chars of the OTA update ID + channel letter (`P` production, `D` preview/.dev, `?` other); embedded build shows the version only.

## 118. 2026-10-05 — Co-founder feedback pass, live

- Devotional display names via `scripts/update-deity-display-names.js` (dry run default). **Never change `deities.name`** — ranking, campaigns, analytics, chip order key on it.
- `GET /deities?hasContent=true` (5-min cache): chips only for deities with content, ≤8 then "More".
- Home wallpaper cards labelled "Status"; pill "Set as Status" calls `shareContent()`.
- `src/utils/openSoundSettings.ts`; `src/utils/saveRingtoneToDevice.ts` saves to a "Ringtones" album (`Music/Ringtones/`) as `Bhav Bhakti - <English title>.mp3`.
- Open: search alias (laxmi → Maa Lakshmi); cancelled shares counted; audio pill Hindi line height; English-only Status caption; 3 ringtones with Hindi embedded title tags.

## 119. 2026-10-06 — Home first-10 guarantee, live

For `GET /feed?sortBy=weighted` with **no filters** (`isHomeRequest`, `feed.service.js`) at every offset: the first 10 include the best-ranked ringtone, aarti, mantra, bhajan, wallpaper and thought (types with none skipped); ≤7 of one media type or deity in the 10; `splitGuaranteedTop()` (`HOME_TOP_SIZE = 10`, `HOME_TOP_TYPES`), `mixRunsExact()` backtracking for the top 10, `mixRuns(…, alreadyPlaced)` for the rest. Any new unfiltered weighted caller gets this too. Content gap: only 2 thoughts.

## 120. 2026-10-06 session — Stories phases 1–5: dev/develop only, NOT on production or main

**Since 2026-11-15/16 live in production — see §147.** The "dev only" wording below is history.

*(Rechecked 2026-11-15: `stories.tsx`/`story-series.tsx` exist only on frontend `dev`; migration `20261006000001` only on backend `develop`.)* Full plan and phase tracker: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Stories_Plan.md`. **Ad-lock design (agreed 2026-11-15; replaces that plan's phases 6 and 8): `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md`; backend built in §144.**
- **Data (Option A):** stories are `feeds` rows, type `stories`. A series row has no audio (cover in the thumbnails); episodes carry `series_id` + `episode_number`; one-offs have neither. `cover_video_url` exists for later.
- **Backend phase 1** (`develop` `9920d9b`; migration run on dev only): shared `FEED_TYPES`; `HOME_FEED_TYPES` excludes stories; `listableFeedWhere()` (active, type rule, never an episode) on every list path; `GET /feed?seriesId=` returns episodes in order, only for an active series; series rows get `episodeCount`. `/tags/popular` now counts only listable feeds.
- **Importer** (`develop` only): series rows import first and need a cover thumbnail; story shape can't change on re-import; **counters are never written when updating an existing feed** (all types). Production's importer still resets them until develop is merged.
- **Content:** Hanuman Immortal series + 8 episodes on the DEV database only (csv ids 201–209); files in Storage `Stories/hanuman-immortal/`. The Feed Import Sheet xlsx was refreshed from dev.
- **Frontend** (`dev`): the Stories tab replaces Rashifal in the bar (Rashifal screens kept, reached from Home); Stories page + series screen (`58952a9`); story player — Next/Previous, auto-advance, Up Next, speed pill instead of the views eye, no shuffle/repeat/counter (`56b3721`, `1875ca0`, `2206623`). Shared `src/utils/openAudioPlayer.ts`. Speed applies only where a speed control is visible (Aarti/Bhajan always 1x). Mantra speed button is now icon + speed text.
- **Not done:** Home/search stories (phase 6), the launch gate (phase 8, production migration + release). Cover video deferred (short looping Home thumbnail idea only).
- **Parked:** rethink views — the eye is in the player, `AutoplayFeedCard` and `FeedCard`; removing it is ~30–45 min; tied to the views-vs-plays decision (§113).
- **When Stories ships:** `MAIN_TAB_PATHNAMES` already holds `/stories` (§129); deep links need `stories` added to both the catalog and `contentLink.ts` together (§141); never merge `develop` into `main` wholesale — the Stories migration must run on production first.

## 121. 2026-10-06 — Auto-advance lost the queue: fixed in v8 (`ce67a95`) with a "finish already handled" flag (Android keeps `didJustFinish` true while ended).

## 122. 2026-10-09 — Play rejection fix, v8

v7 rejected (Photo and Video Permissions policy). Removed READ_MEDIA_IMAGES/VIDEO/VISUAL_USER_SELECTED, RECORD_AUDIO, ACCESS_MEDIA_LOCATION; `blockedPermissions` added; wallpapers use a write-only request on Android 13+, ringtones audio only; READ_MEDIA_AUDIO and READ/WRITE_EXTERNAL_STORAGE kept. `expo-application` added (import inside try/catch). An old CLAUDE.md is tracked on `production`/`master` from an old commit — left in place.

## 123. 2026-10-09 — .dev splash hang; Premium popup

**Rule: any native module added to the shared `package.json` must be tested on a `.dev` build first** (`.dev` has no Meta plugin; an eager `react-native-fbsdk-next` import hung the splash; `dev` `765b45f` loads it lazily — deliberately not on production, which loads it fine). Premium "coming soon" popup: `PREMIUM_PURCHASE_AVAILABLE = false` in `PremiumPaywall.tsx`. Railway: health check `/api/v1/health` (300 s); production MySQL volume 5 GB; usage alert $20, hard limit $50. Razorpay: company GST registered; build checkout on `.dev` with test keys first.

## 124. 2026-10-11 — v8 live on Play (Managed publishing); Meta app published (`com.orivori.bhavbhakti`). Numbers: Play Console Statistics, Firebase `first_open`, Meta Events Manager, the database. Closed testing track kept for testing.

## 125. 2026-10-14 — Video-memory fix (Stage 1), live

Reference: `Bhav_Bhakti_Media_Memory_Investigation_2026-10-14.md`. Firebase MCP (Crashlytics) is read-only — no notes or state changes.
- Cause of OOM crashes: hub grids kept 10+ videos playing, Home ~10 loaded players, full-size originals, no thumbnails; plain RN `Image` keyed by signed URL (**expo-image NOT installed**); videos uncached (expo-av).
- Fix: hub grids mount a player only while a tile is ≥50% visible, ≤4 playing, hub focused (`src/hooks/useVisibleVideoTiles.ts`, `shouldMountVideo`); Home mounts the active card ±1; `windowSize` 5 on hubs and Home.
- `.dev`'s "Test crash (Crashlytics)" button is in Profile → Debug.
- **Paused Stage 2:** `sharp` WebP variants + thumbnails (dev database first, then OTA, then production), lossless faststart remux for videos. B1 (day-stable signed URLs) postponed. expo-image and native crash symbols still to do.

## 126. 2026-10-15 — Update-available prompt, live (soft prompt ON since 2026-11-07, §142)

Rules and test table: "UPDATE PROMPT" in `Bhav_Bhakti_Handoff.md`.
- Soft (dismissible) prompt below the latest build; full-screen `UpdateRequiredScreen` below the minimum; both open the production listing via `openStoreForUpdate()` (`src/utils/appUpdate/`).
- **Flags** on `bhav-bhakti-be`, served by `GET /feature-flags`: `UPDATE_PROMPT_ENABLED` (exactly `true`), `ANDROID_LATEST_BUILD`, `ANDROID_MIN_BUILD` (1–9999; min ignored unless a valid latest exists and min ≤ latest). Missing = off. Each edit redeploys — check the flags URL after.
- **Installed build:** lazy try/catch `require('expo-application').nativeBuildVersion`. **Never use `Constants.expoConfig.android.versionCode`** (comes from the OTA). Runs only on production builds and `.dev`, never `__DEV__`; any odd value = nothing; maintenance wins; soft prompt only at calm moments on `MAIN_TAB_PATHNAMES` (`updateDecision.ts`: `/`, `/mantras`, `/ringtones`, `/daily-status`, `/horoscope`, `/stories`).
- **Rule: never raise `ANDROID_MIN_BUILD` until the new build is at 100% on Play.**

## 127. 2026-10-22 — Search/video fixes, live (OOM 6 → 1, ANRs 3 → 0; `libc.so` SIGABRT at the Wallpapers hub unchanged, needs symbols). **Rule:** a hidden-tab screen reading `returnTo` needs a `useFocusEffect` BackHandler.

## 128. 2026-10-23 — Railway security incident: all secrets rotated

Map: `Railway_Credential_Rotation_Map_2026-10-22.md` (docs folder).
- One Firebase service-account key (ID starts `6b6312ba`) for the production API, dev API, backup service and the laptop's `src/config` file; older keys deleted. (A separate `admob-sync` service account exists for BigQuery, §143.)
- **Database:** new passwords in both environments. `MYSQL_ROOT_PASSWORD` on the MySQL service is the source; the backup service follows by reference, but the API and the horoscope service hold hand-copied `DB_PASSWORD` values — **rotate all together.** New `JWT_SECRET`, Gemini key and Railway tokens. Razorpay test keys not rotated; leftover AWS/Google/Facebook/OTPless variables deleted from Railway (not revoked at issuers).
- `64e85d1`: `Dockerfile.backup` was missing `src/config/storage.config.js` (see §99's rule).

## 129. 2026-10-28 — A1: counter default 11, baseline events, sheet back fixes — live (v8 OTA from `96e7c89`)

- Chant counter default 108 → 11 (`AudioPlayerSheets/chantTargets.ts`; chips 11/27/108, More 11–1008; free).
- Firebase events `counter_viewed`, `counter_opened`, `counter_target_changed`, `counter_milestone` (`useChantCounterAnalytics.ts`); `screenshot_taken {content_type}` (Android 14+, `useScreenshotContentType`).
- Android back closes the topmost open player sheet first (`src/hooks/useSheetBackStack.ts`); "More targets" uses `stackBehavior="push"` (5.2.14's default 'switch' dismisses the sheet underneath); the MiniPlayer passes `returnTo`/`returnParams`.
- `MAIN_TAB_PATHNAMES` gained `/horoscope` and keeps `/stories`. Next steps: Roadmap ("Decisions of 2026-10-25") and Revenue Model §5d.

## 130. 2026-10-28 — A2 AdMob backend (live on `main` since §133; gate ON in production)

**Status correction (2026-11-15, read-only production check):** the gate is live. `ad_unlocks` exists on production with 549 rows: first on 30 Oct, daily since 11 Nov, about 150–200 a day from 13 Nov, mostly build 11, heaviest user 15 in a day, about 1 in 3 grants `no_fill`. So `AD_UNLOCK_ENABLED` is on; no `view` unlock since 2 Nov suggests `AD_VIEW_GATE_ENABLED` is off (Railway not checked).

Backend only (plan: Revenue Model §5d). `develop` `f8013a6` (account id in the request log), `a706a05` (`ad_unlocks` migration `20261028000001` + `AdUnlock` model), `372af88` (`POST /api/v1/ad-unlocks`), `6215f79` (gate) → `main` `bbe5e61`, `3addaf3`, `69f063d`, `e3d09c3`. No Stories code involved.
- **Request log:** every morgan line ends `user=<id>` (or `user=-`).
- **`ad_unlocks`:** user_id, feed_id (both cascade on delete), kind (`view`/`download`/`share`/`set_status`), source (`reward`/`no_fill`), granted_at, expires_at, client_build (`X-App-Build` header), ad_transaction_id (empty until SSV).
- **`POST /ad-unlocks`** `{feedId, kind, source}`: login; only actions the gate can lock (wallpaper/thought view/download/share/set_status, ringtone download), else 400; 30-minute window (`AD_UNLOCK_WINDOW_MINUTES`); while active it returns 200 + the existing unlock and writes nothing; 20/min per user; 100 grants per user per IST day (`AD_UNLOCK_DAILY_CAP`; reward and no_fill both count) → 429 "Daily unlock limit reached…". Log line `[ad-unlock] user= feed= type= kind= source= build= result=` (`granted`/`already_active`/`cap_reached`). **no_fill is never a reward** — count rewards with `WHERE source = 'reward'`. Guests may use it (only `/subscription/create` refuses guests, §136).
- **Gate** (`mediaAccess.service.js`): `AD_UNLOCK_ENABLED` (master) and `AD_VIEW_GATE_ENABLED` (enlarged view only; ignored without the master). Both off = exactly the old behaviour (no query unless `PREMIUM_GATING_ENABLED` is `true`). Master on: it decides alone (`PREMIUM_GATING_ENABLED` ignored) — ungated → allow; view with the view switch off → allow; no `X-Ads-Capable: 1` header → allow (old builds never stuck); premium → allow; active unlock for user + feed → allow; else 403 `PREMIUM_REQUIRED` + `unlock: 'ad'`. Stories and the counter not gated. Switch values: `true` trimmed, any case.
- **The app must send** `X-Ads-Capable: 1` (only once the ads module has loaded) and `X-App-Build: <versionCode>` (A3, done).
- Migration `20261028000001` is on `main` and in production's `SequelizeMeta` (verified 2026-11-15). Known limits: two simultaneous grants for the same feed can both insert (harmless, one extra row); rate-limit counts reset on deploy (§98).

## 131. 2026-10-29 — A4 `.dev` build failed on Kotlin metadata: fixed (`dev` `c625665`, on `production`)

`react-native-google-mobile-ads` 16.5.0 pins `play-services-ads` 25.4.0, built with Kotlin 2.3 (metadata 2.3.0; SDK 25.0.0–25.2.0 carry 2.2.0, 25.3.0+ carry 2.3.0). RN 0.81.5 compiles with Kotlin 2.1.20 (its version catalog; nothing overrides it), which reads metadata at most one version ahead, so `:react-native-google-mobile-ads:compileReleaseKotlin` failed. The library has no setting for the SDK version (it reads its own `package.json`). Fix: config plugin `plugins/withAdsKotlinMetadataSkip.js` adds `-Xskip-metadata-version-check` to that module's Kotlin compile only — the same fix the library ships itself from 17.0.0. **Remove it on library 17+ or Kotlin 2.3+.** Verified locally (Java 21, Gradle 8.14.3, `.dev` prebuild): the module and `:app:compileReleaseKotlin` compile; without the flag the module fails with the EAS error. **Lesson: a manifest-merge trial doesn't compile Kotlin; test a new native module with a real `compileReleaseKotlin`.** Writing a Gradle file from PowerShell 5.1 adds a BOM that Gradle rejects — edit with `sed`.

## 132. 2026-10-29 — A3/A4 AdMob app: built, in every build from v9 on

Plan and IDs: Revenue Model §5e/§5f. **A3** (`dev` `5bad964`..`00bd107`, 8 commits): library pinned at 16.5.0; the ads plugin with a per-variant app ID and a guard that fails a production native build without a real app ID (`eas update` unaffected); the ad engine in `src/features/ads/` (lazy-loaded module, `rewardedAd.ts`, `adUnlockFlow.ts`, `pauseMediaForAd.ts`); the opt-in card `AdUnlockSheet` (en/hi `adUnlock.*`) mounted at the root; `mediaAccess.ts` runs the flow on 403 + `unlock: 'ad'`; `apiClient` sends `X-App-Build` and, only once the ads module has loaded, `X-Ads-Capable: 1` (§130); audio pauses and hub/Home/enlarged-view videos hold still while an ad loads or shows; `.dev`-only "Show test ad" / "Simulate no ad" in Profile → Debug (`d846442`); version 1.1.0, versionCode 9 / `.dev` 5 (`00bd107`, a new OTA runtime).
- **A4:** the first `.dev` EAS build failed (§131); the second succeeded. The founder's phone checklist passed against the dev backend. "Closed before the reward" can't be tested with Google's test ad (no close button before the reward); confirmed by code reading: nothing recorded, `ad_closed_no_reward` sent, audio resumed only if we paused it, and the next tap offers the ad again.
- **Hindi buttons** (`91bdddf`): "विज्ञापन देखें" / "अभी नहीं" showed only their first word — the §71 cause again. Fixed via `textStyle`: `flex: 1`, centred, 26 lineHeight/minHeight floor; main line 14 → 18 (lineHeight 30). **Every new `Button` with a Devanagari label needs this `textStyle`.** (`UpdatePromptModal`/`UpdateRequiredScreen` got the full fix in `7be1c3e`, on production as `3180290`.)
- **Testing on `.dev`:** turn the gate on with `AD_UNLOCK_ENABLED` / `AD_VIEW_GATE_ENABLED` (`true`/`false`) on Railway dev's `bhav-bhakti-be`. (The old trap where a fresh preview build called PRODUCTION until a dev OTA landed ended with build 6, §138; still check Profile → About ends in `D`.)
- **A6 (done, §133):** `production` = tag `v8-final` (`96e7c89`) + cherry-picks `5bad964`, `ff22ada`, `6a798fc`, `3415310`, `e714fde`, `cd5fa04`, `c625665`, `91bdddf` (as `af58aa3`..`a753ccc`, real AdMob IDs in `ADMOB_PRODUCTION_ANDROID_APP_ID` in `app.config.js` and `PRODUCTION_REWARDED_AD_UNIT_ID` in `src/features/ads/adsModule.ts`; `TEST_DEVICE_IDS` there too) + bump `2c53d86`. **Never** cherry-pick `d846442` or CLAUDE.md commits.
- **Release flow for turning ads on:** hard update first (`ANDROID_MIN_BUILD`, §126/§142), then `AD_UNLOCK_ENABLED` (and optionally `AD_VIEW_GATE_ENABLED`) on production's `bhav-bhakti-be`, verified via the flags/endpoint behaviour.

## 133. 2026-10-30 to 11-02 — v9 in closed testing, A2 live, link safety handler + deferred-link probe live

- **v9 (1.1.0, versionCode 9):** `production` = `v8-final` (`96e7c89`) + the A6 cherry-picks (`af58aa3`..`a753ccc`, real AdMob IDs included) + the bump `2c53d86`. Superseded by v10 (§134) and v11 (§140/§142); all share runtime 1.1.0 and every OTA.
- **A2 AdMob backend (§130) is on `main`** (`bbe5e61`, `3addaf3`, `69f063d`, `e3d09c3`) and live: on `api.orivori.com`, `POST /api/v1/ad-unlocks` returns 401 without a login (an unknown route returns 404).
- **Live on production** (runtime 1.1.0), both cherry-picked with `-x`: `dev` `f0812ba` → `production` `324ebcc`, the link safety handler (`app/+native-intent.tsx`, `src/utils/deepLinks/contentLink.ts` + `contentLink.test.mjs`, `src/store/pendingContentLinkStore.ts`, cleared on logout); `dev` `5741b6e` → `production` `2f863ae`, the deferred-link probe (`src/utils/deepLinks/deferredAppLink.ts`; events `deferred_link_checked`/`deferred_link_received` in `deepLinkEvents.ts`; production app only, first 3 launches per install, never navigates; switch `DEFERRED_LINK_PROBE_ENABLED`).
- **Rule: a `bhavbhakti://` link never opens a screen.** `redirectSystemPath` only stores a valid `bhavbhakti://open/<type>/<feedId>` as the pending link (7-day expiry, read once) and always returns `/`. Before this, expo-router opened any path in the scheme, skipping login and the notification allow-list, and `audio-player?audioUrl=` could play outside audio. Never build a route or param from a link; the id reaches the API only through `feedIdForApi()`.
- The Home pin that shows the pending link is built (§134). Tests: `node --test src/utils/deepLinks/contentLink.test.mjs src/utils/deepLinks/homePin.test.mjs`.

## 134. 2026-11-02 — v10: Meta + Firebase events, Home pin (pin ON on production)

- **Commits:** `dev` `837760b` (events), `8159a04` (ringtone action word), `0921da6` (Home pin), `4700afa` (3 s cap) → `production` `7076447`, `c0bfef1`, `77ccc37`, `e739049` (`-x`, no conflicts), plus the bump `23c6480` (versionCode 10; tag `v10-final`). `version` and runtime stay 1.1.0, so v9/v10/v11 share every OTA; no native change since v9 (`2c53d86`).
- **Events:** gate taps, logged at the tap before any gate, permission or "already saved" check (`gateTapEvents.ts`; same feed + action within 1 s counts once): Firebase `gate_action_tap {action, content_type}`, Meta `gate_action_tap` + `wallpaper_download`/`_share`, `thought_download`/`_share`, `ringtone_set`. Meta mirrors of `first_content_completed`, `rashifal_viewed`, `chant_counter_used`, `content_shared`; Meta `returned_day_2` (once ever; never for installs from before v10, `returnedDay2.ts`); `ad_watch_tapped` (Firebase + Meta) on "Watch ad"; Meta `ad_watched` now carries `content_type`/`action`. Pin events (Firebase only): `deferred_link_pinned {content_type}`, `deferred_link_pin_skipped {reason: expired|not_found|type_mismatch|error}`. No ids, titles or personal data anywhere.
- **Rule: every analytics event uses the action words download | share | view | set_ringtone | listen** (a ringtone's download is `set_ringtone`, `toAdEventAction` in `adEvents.ts`; `listen` = a story unlocked by an ad, §144, added 2026-11-15). The backend keeps `kind: 'download'` (`POST /ad-unlocks`).
- **Meta events fire only in the production app** (SDK loaded lazily in `metaAppEvents.ts`/`metaAdEvents.ts`) and can't be tested on `.dev` — check them in Meta Events Manager on a production build. `metaEvents.ts` on `production` still imports the SDK at start, as in v8/v9 (§129).
- **Home pin** (`useHomePin.ts`; pure rules in `homePin.ts` + `homePin.test.mjs`): needs BOTH the code constant `DEFERRED_LINK_PIN_ENABLED` (`true` on production, `deferredAppLink.ts`, checked 2026-11-15) and the backend flag `deferredLinkPinEnabled` (backend `develop` `bb8f40c`, `main` `46b7574`; `true` on production since 2026-11-06). Read once when Home mounts; flag off, missing or unsettled = Home exactly as before (no wait, no store read, no event). When on: waits for the probe only on an install under a day old, whole decision capped at 3 s, item from `GET /feed/:id`, the link type must match `feed.type`; card 1, removed from later pages, dropped on pull-to-refresh.
- **The reader writes, the pin only reads:** the probe saves a received link into the pending-link store (with installTime); the pin peeks and removes it only after a definitive result (shown, 404, type mismatch, expired or from another install). A network error, timeout, 5xx or 401 keeps it. Every link or pin failure falls back to the normal Home.
- **Deferred-link tests:** after a reinstall, always run `adb shell pm clear com.orivori.bhavbhakti` before the first open — Android auto-backup restores old app data, including the Facebook SDK's own record, and a `none` then proves nothing. On `.dev` the probe never runs; test the pin with the adb VIEW link instead.

## 135. 2026-11-02 — Feed 106 archived; importer never reactivates retired feeds

Feed 106 (csv 106, "Kali Wallpaper 7") set `status = 'archived'` on production (AI defect); Storage file kept. Undo: `UPDATE feeds SET status = 'active' WHERE id = 106 AND csv_id = 106 AND status = 'archived';` **Rule (develop `6117c26`, main `9470507`): the importer skips any feed whose status is `archived` or `deleted` and writes nothing for that row** (logs it; summary `Retired feeds skipped: N (ids ...)`). It never deletes or deactivates rows missing from the sheet; re-activating is a deliberate manual step. The backend serves only `active` feeds and caches no feed lists; the app keeps a loaded list until pull-to-refresh, chip change or restart.

## 136. 2026-11-05 — Silent guest login, backend (live since §140)

Locked decisions: `Bhav_Bhakti_Guest_Login_Build_Spec_2026-11-05.md`. `develop` `7a788bd` → `main` `ae29557`; migration `20261105000001-add-guest-accounts`.
- **Order rule: migrate BEFORE the code deploys** (the `User` model selects the new columns). Inside the migration `user_history` gets `'guest'` first, or the `users_after_insert` trigger fails.
- **Schema:** `'guest'` on `users.auth_provider`, `user_history.auth_provider`, `login_history.login_type`; `users.guest_install_hash` CHAR(64) and `users.support_id` VARCHAR(12), both unique; index `(auth_provider, created_at)`; `login_history.source` (`login`, `guest_start`, `guest_renew`). `down` refuses once guest rows exist.
- **Guest row:** phone, country code, `firebase_uid` NULL (pass `countryCode: null` explicitly — model default is `+91`); `is_verified` 1 means "may pass `authenticate`", not "phone verified". Support ID = `G` + 6 chars from A–Z/2–9 without O and I. The server stores only the SHA-256 of the lowercased v4 install id.
- **`POST /auth/guest`** `{installId, isTestAccount}` (`src/services/guestAuth.service.js`): known guest → 200 + fresh token, even with the switch off; unknown → 201, or 403 `GUEST_DISABLED` when off, 429 `GUEST_RATE_LIMITED`/`GUEST_DAILY_CAP`; no longer a guest → 409 `GUEST_NOT_A_GUEST`; blocked → 403 `GUEST_INACTIVE`; bad id → 400. **Never 401** (the app reads 401 as "start a guest"). Guest tokens fixed at 10 days.
- **Limits:** 30/min and 200/hour per IP for NEW install ids only (after the known-install check); 300/min flood backstop; `GUEST_DAILY_CAP` (default 5,000 per IST day) counted in the database, one log warning a day at 50%. Logs: `[guest-start]`.
- **Switches:** `GUEST_LOGIN_ENABLED` (only `true`), `GUEST_DAILY_CAP`. No rollout percentage. Both environments ON.
- **Also:** `GET /analytics/global-stats` needs admin; `POST /subscription/create` refuses guests (403 `GUEST_NOT_ALLOWED`); login responses carry `supportId`; `GET`/`PUT /profile` carry `authProvider` and `supportId`. Dev has ~30 leftover test guest rows (kept on purpose).

## 137. 2026-11-05 — Silent guest login, app (live in v11)

`dev` `6791d19` → `production` `4e0509d`. JS only.
- **Files:** `src/features/authentication/services/guestSession.ts` (`startGuestSession()`, shared in-flight request), `utils/installId.ts`, `utils/guestStartRules.ts` (+ `guestStartRules.test.mjs`), `src/store/guestStartStore.ts`, `src/components/molecules/GuestStartScreen/`; `app/index.tsx` decides spinner, start, Retry or Home.
- **Rules:** the install id lives in AsyncStorage and survives `secureStorage.clearAll()`. **No guest may start before storage has been read** (`whenAuthInitialized()`); `secureStorage.readSession()` tells a failed read from an empty one (3 attempts); a read unfinished after 10 s shows Retry. An expired stored token is cleared with an `await` before starting.
- **Any 401** (`apiClient` → `handleSessionExpired(failedToken)`): start/renew a guest session and repeat the request once; server refusal → `clearSession()` + `router.replace('/')` (Retry). `clearSession()` keeps the pending content link; only `logout()` clears it, and nothing calls `logout()` now (Logout removed on production). `LoginPromptModal` isn't mounted.
- **Events:** `guest_started` and `markNewUserSignup` fire when the server says new OR this install never finished a start (`guest_start_finished`); `markNewUserSignup` runs before `login()`. Firebase user property `account_type` (`guest`/`phone`, `authStore.ts`).
- **Notifications:** the dialog is asked once, after the first finished audio, wallpaper save, wallpaper share/Set as Status, or ringtone save (`requestNotificationPermissionOnce`; not thoughts). The flag is set only after Android answers (`8a0a836`); Android ≤12 subscribes as soon as there's a session.
- **Testing:** `pm clear` wipes the OTA (`.expo-internal` is under `filesDir`), so the built-in code runs first — a true first open needs a build containing the code.

## 138. 2026-11-05 — Taurus/Leo/Scorpio birthdate fix, live; `.dev` build 6

`profile.validator.js` rejected `vrishabh`, `singh`, `vrishchik`, so those birthdates couldn't be saved. Fix (`develop` `5e268bc` → `main` `9744993`): accept every name in `RASHI_TO_ZODIAC`. Rashifal itself reads `zodiacSign`, not the rashi; dev has almost no horoscope rows, so `/horoscope/today/:sign` 404s on dev. Hindi Save/Delete buttons fixed (`6609629`). `.dev`-only debug row `898e2c0` — **never cherry-pick**. `.dev` build 6: the `preview` profile in `eas.json` sets `APP_VARIANT=development`, ending §132's trap.

## 139. 2026-11-06 — Guest login Phase 3: production (with §140)

Plan with the founder's commands: `Bhav_Bhakti_Guest_Login_Phase3_Production_Plan_2026-11-06.md`.
- **Backend:** backup `backups/2026-11-06-0113.sql.gz`; migration `20261105000001` run by the founder **from `main`** (never from `develop`, where `--to` would also run the Stories migration); `main` `ae29557`, deploy `65c7db84`; then `GUEST_LOGIN_ENABLED=true`. A leftover lowercase `sequelizemeta` table on production is harmless.
- **Frontend `production`:** `4e0509d` (guest app; conflict resolved by removing Logout and debug tools, Stories strings left out), `814ed36`, `ffceb74`, `c7f22d6`, `3180290` (Hindi update buttons), `1237b5a` (versionCode 11; `.dev` 6). Not picked: `898e2c0`, `6caf317`, `911e5af`, Stories, debug tools. Tag `v10-final` = `23c6480` (code before guest login).
- **Rule: never publish an OTA to runtime 1.1.0 from a branch without guest login** — it would be newer than v11's own code and put v11 back on phone login. The unused branch `ota/v8-hindi-update-buttons` (`8f699f0`) stays unused (**no v8 OTA**, founder decision).
- Production service names: `MySQL`, `db_backup`, `Daily_Horroscope`, `bhav-bhakti-be` (+ `admob_sync`, §143).
- Play: App access and Data safety updated; Firebase `account_type` user property registered. Open: privacy policy text.
- Decisions: soft prompt right after v11 at 100% (done, §142); **hard update before ads.**

## 140. 2026-11-06 — switch ON on production, v11 to review — in §139.

## 141. 2026-11-07 — Deep link catalog, live on backend `main`

- **What:** `deeplink_catalog.csv` lists every active aarti, bhajan, mantra, ringtone, wallpaper and thought on production for Meta ads. First line: comment with IST time and row count; columns `id, type, title_en, title_hi, storage_path, deep_link`; UTF-8 BOM for Excel. Written to `D:\bhav_bhakti_Claude_docs\` if present, else gitignored `bhav-bhakti-be/deeplink-catalog-output/`. Lookup instructions for the co-founder: `Bhav_Bhakti_Deeplink_Lookup_Instructions_2026-11-07.md`.
- **Commits:** `develop` `6405182`, `04cc081`, `03a1071` → `main` `4800dfc`, `192e040`, `1cec6be`.
- **Refresh by hand** (from `bhav-bhakti-be`): `$env:RAILWAY_TOKEN = $env:RAILWAY_TOKEN_PROD`, then `railway run --service MySQL -- npm run export:deeplinks`, then close the window. Plain `npm run export:deeplinks` reads `.env` (dev) and refuses by design.
- **Import to production:** same token, `railway run --service MySQL -- node scripts/import-feeds-production.js "<sheet.csv>"` (maps Railway's MySQL variables onto `DB_*`; without it `railway run` falls back to `.env` and imports into dev).
- **Rules:** production = the host check in `getDatabaseTargetLabel()`, never `NODE_ENV`; read-only session enforced by MySQL; empty/URL/tokened paths are left out with a warning; an empty result or failed write keeps the old file (close Excel if the rename fails); a failed refresh after an import is only a warning. **If Railway regenerates production's proxy host, update `KNOWN_DB_HOSTS`.**
- **Don't use the import sheet's `id` as a deep link id** — the catalog reads the real id (on production they match only by coincidence). A link to a retired feed opens the normal Home.
- First production file (2026-11-07): 172 rows, all checks passed.

## 142. 2026-11-07 — v11 live in Production, soft update prompt ON, deferred deep link tested

Founder-confirmed (Claude didn't check Play, Railway or the flags URL).
- v11 (`1237b5a`) live in Production. Frontend `master` fast-forwarded to `1237b5a` (= `production`, rechecked 2026-11-15).
- **Soft prompt ON:** `UPDATE_PROMPT_ENABLED=true`, `ANDROID_LATEST_BUILD=11`, no `ANDROID_MIN_BUILD` (nobody blocked).
- Deferred deep link tested end to end; Meta's install-ad Deep link field accepts `bhavbhakti://`.
- Still in force: the runtime-1.1.0 OTA rule (§139–140); never raise `ANDROID_MIN_BUILD` before v11 is at 100% (rollout % not confirmed); hard update before ads. v8's update prompt was never tested on a real v8 install.

## 143. 2026-11-14 — AdMob → BigQuery daily sync: live in production (Railway `admob_sync`)

Reference for the co-founder: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_AdMob_BigQuery_Reporting_2026-11-14.md`. Decisions: account time zone IST, currency USD (unchangeable), dataset `admob` in `asia-south1` (same as the Firebase export), OAuth with the founder's Google account, a separate `admob-sync` service account for BigQuery. Rewarded completions come from the Firebase export, not this job.
- **Commits:** `develop` `adafd40`, `401ac95`, `7d62697`, `33d5d48`, `c03b2e8` → `main` `f94e2b2`, `6d91678`, `ff8dc27`, `ed0aa4c`, `b811ab3`.
- **Files:** `scripts/sync-admob-to-bigquery.js`, `src/utils/admobReport.util.js`, `scripts/admob-get-refresh-token.js` (one-time laptop helper, prints only the refresh token), `Dockerfile.admob` (2 files + `@google-cloud/bigquery@9.5.0` + `dotenv`). `@google-cloud/bigquery` is a devDependency — the API image is unchanged.
- **A run:** window = last 7 days to yesterday IST (+ the whole previous month on the 5th, + optional `--backfill-from YYYY-MM-DD`); one `networkReport:generate` per month in USD (header currency must be USD); time zone read from the account's `reportingTimeZone` (must be Asia/Kolkata or Asia/Calcutta; rows store `Asia/Kolkata` + `time_zone_source`); ranges hitting the 100,000-row cap are halved. Earnings and the four counts are strict (missing/wrong form fails the run, nothing written); `IMPRESSION_RPM` (arrives as dollars, not micros) and rates are stored as sent or NULL. Load into `_staging_<run>` (1-day expiry) → one transaction deletes the window and inserts → row count checked → staging dropped → one `sync_runs` row. One `[admob-sync] SUCCESS …` or `FAILED stage=…` line; exit 1 on failure; secrets scrubbed. Retries 408/429/5xx/network 4× (~5/20/60 s). An empty AdMob window never deletes stored days unless `--allow-empty`. Modes: `--print-only`, `--print-header`, `--print-shape`, `--dry-run`.
- **BigQuery:** `admob.network_report_daily` (partitioned by `report_date`, clustered by `country`, `ad_unit_id`; `estimated_earnings_micros`), `admob.sync_runs`, view `admob.daily_summary` (eCPM and rates recomputed from summed counts — **never sum/average AdMob's rate columns or use the reported RPM**).
- **Railway:** service `admob_sync`, `Dockerfile.admob` via `RAILWAY_DOCKERFILE_PATH`, restart Never, cron `30 2 * * *` UTC (08:00 IST). Variables `ADMOB_CLIENT_ID`, `ADMOB_CLIENT_SECRET`, `ADMOB_REFRESH_TOKEN`, `ADMOB_PUBLISHER_ID`, `ADMOB_BQ_SERVICE_ACCOUNT_JSON` (base64). Verified by a manual run on 2026-11-14; AdMob days matched the dashboard for 11–13 Nov. OAuth consent screen is "In production" (refresh token doesn't expire after 7 days).
- **Rules:** the two credential files live in `D:\bhav_bhakti\` (`client_secret_…json`, `bhav-bhakti-…json`), never printed, committed or copied into a repo/build context (`.gitignore` blocks both patterns). **Any new `require` in the sync script or util must be added to `Dockerfile.admob`** (`scripts/__tests__/dockerfile-admob.test.js` enforces it). Each helper run mints a new refresh token (Google keeps ≤100 per account+client, silently retiring the oldest).
- **Known:** `APP_VERSION_NAME` is `1.1.0` for v9–v11, so the version column can't tell them apart. Not built: Meta ad spend in BigQuery.

## 144. 2026-11-15 — Stories ad-lock, backend: `develop` and the dev database only, switch OFF

**Since 2026-11-15/16 live in production, switch ON — see §147.** The "dev only / OFF" wording below is history.

Design: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md`. Commits `develop` `8f1012d` (schema), `cea5ac3` (lock step), `34a4740` (endpoint), `147afb5` (page size), `44208fe` (importer); pushed, dev deploy checked. **Nothing on `main` or production.** App side: see the "App side" bullet below (frontend `dev` only).
- **Schema** (migration `20261115000001`, run on DEV only via `migrate-development.js`): table `story_unlocks` (user_id, feed_id, both cascade; source `reward` | `no_fill`; granted_at; expires_at — **unused since 2026-11-15**: every row is permanent whatever it says; client_build; ad_transaction_id empty until SSV; UNIQUE (user_id, feed_id)); `feeds.free_episodes` (SMALLINT, series rows; NULL = 1) and `feeds.ad_gated` (BOOLEAN; NULL = follow the series, 0 = free, 1 = always an ad). Model `StoryUnlock`. Migrate BEFORE deploying this code anywhere (the Feed model selects the new columns).
- **States** (`src/utils/storyLock.util.js`, pure): by position in episode_number order (gaps and archived episodes don't matter): `free` (position ≤ free_episodes, or ad_gated false; ad_gated true overrides the free count), `unlocked` (any unlock row, reward or no_fill), `next` (first not-playable), `locked` (the rest). Single story: `free` only if ad_gated false, else `unlocked`/`next`. `temp` is no longer produced (the app still reads it as playable).
- **The one lock step** (`src/services/storyLock.service.js`): every `feed.service` response goes through `serializeFeeds()` → `applyStoryLocks()` before signing: `next`/`locked` get `url: null` and are never signed; thumbnails stay signed; stories get `state`; series rows get `freeEpisodes`, `unlockedCount` (playable episodes), `episodeCount`. `serializeFeed()` is fail-closed: with the switch on, a story that skipped the step loses its audio (logs `[story-lock]`). `X-Ads-Capable` ignored for stories. Paths covered (leak test `feed.service.storyLock.test.js`): `GET /feed` (normal, `seriesId=`, `type=stories`, search, weighted), `/feed/trending` (and `/trending/mantras`, same function), `/feed/user/liked`, `/feed/:id` (also the app's Home pin and deep-link lookups). No user = everything not free is withheld.
- **`POST /api/v1/story-unlocks`** `{feedId, source}`: login; switch off → 403 `STORY_LOCK_DISABLED`; non-story or series row → 400; already playable → 200, nothing written; not the current `next` → 409 `PREVIOUS_EPISODE_FIRST` "Unlock the previous episode first"; **reward and no_fill are both permanent** (founder decision 2026-11-15: no fill is AdMob's fault, not the listener's; the 24-hour pass was dropped; `source` is only a label so no-fill unlocks can be counted; no separate no-fill limit); a reward after a no_fill answers 200 and writes nothing (one row ever per user + feed; a lost race answers 200; backend `develop` `5d8dbbb`). Cap `STORY_UNLOCK_DAILY_CAP` (default 100 per user per IST day, separate from wallpapers) and 20/min per user → 429. Log `[story-unlock] user= feed= series= episode= source= build= result=granted|already_playable|refused|cap_reached`.
- **Switches** on `bhav-bhakti-be`: `STORY_LOCK_ENABLED` (exactly `true`, trimmed, any case; off = identical responses, no query), `STORY_UNLOCK_DAILY_CAP`. Both unset on dev and production.
- **Page size:** `GET /feed?seriesId=` accepts `limit` up to 300 (`SERIES_EPISODES_MAX_LIMIT`); all other lists stay at 100. The app's series screen still asks for 100 — change it in the app work.
- **Importer** (`develop` only): optional columns `free_episodes` (series rows, whole number ≥ 0) and `ad_gated` (stories rows, yes/no/blank); both may change on a re-import (settings, not shape); a sheet without the column leaves them untouched; summary line `🔒 Story lock settings`. Counters still never written on update; retired feeds still skipped. Template header updated.
- **Dev data:** Hanuman series (csv 201, dev id 187) has `free_episodes = 2` (intro + first real episode), set by a one-off dev-only script.
- **App side (frontend `dev` only, 2026-11-15; `0d52c35`, `f863740`, `83de7b1`, `da63eff`, `5b2bd6f`; not on `production`; phone test pending):**
  - `src/features/stories/`: `storyLock.ts` (pure rules + `storyLock.test.mjs`: no `state` = playable, exactly as before; tap = play / ad / "previous episode first"; `canPlayQueueItem`), `storyUnlockApi.ts`, `storyUnlockFlow.ts` (the ad flow on the existing engine: card → ad → `POST /story-unlocks` reward; no ad → **one retry**, then `no_fill` (permanent) + the notice "No ad was available right now, so we've unlocked this episode for you." — the episode plays only after OK; closed early → nothing; 409/403 `STORY_LOCK_DISABLED`/429 handled; one flow at a time), `useStoryOpener.ts` (series screen and Stories page taps; refetches after an unlock).
  - **Story messages are one centred notice, not toasts** (`dev` `d508a11`): `src/store/storyNoticeStore.ts` + `src/components/molecules/StoryNotice/` (mounted at the root next to `AdUnlockSheet`, same card look, message + OK; OK, tap outside or back dismisses; never two at once; `show()` resolves on dismiss, unit-tested in `storyNoticeStore.test.mjs`). Messages: previous episode first, the no-ad unlock, the daily limit, "Couldn't unlock, please try again". The flow shows its notice only after the ad screens are gone. The update prompt waits while it's open. Wallpaper/ringtone ad flows are unchanged.
  - **`isStorySeries` now reads `mediaType`, not a missing url** — a locked single story also has url null.
  - Series screen: limit 300 + paging; open lock / next ("Watch an ad to unlock") / greyed lock rows; "N of M unlocked". Stories page: lock badge on a locked single story.
  - Player: never a playback error for a locked story; end of episode with the next locked → stop + prompt (on return if backgrounded) → next plays after the ad; "Unlock next episode" button while playing; Next/Previous/Up Next follow the rules; lock-screen Next/Previous in the background stay put. Queue items carry `storyState`/`seriesId`; `playbackStore.patchQueueItems` refreshes them after an unlock. Up Next rows show locks.
  - **Constants:** `STORY_REWARDED_AD_UNIT_ID` in `src/features/ads/adsModule.ts` is **empty** (falls back to the existing unit) until the founder creates the stories ad unit in AdMob; `.dev` always uses Google's test unit. `prepareRewardedAd(placement)`; `prepareRewardedAdRetry` keeps the `.dev` "Simulate no ad" switch simulating on the retry.
  - **Tracking:** ad events carry `content_type: 'stories'`, `action: 'listen'`, `trigger` (`episode_list` | `end_of_episode` | `up_next` | `single_story` | `during_playback`); Firebase `story_lock_shown`, `story_unlock_tapped`, `story_unlock_completed` (source `reward` | `no_fill`), `story_unlock_closed_no_reward`, `story_unlock_no_fill`, `story_episode_started`, `story_episode_completed` with `episode_number`, `free_episodes`, `series_key` (series feed id, Firebase only), `is_single` (`src/utils/analytics/storyEvents.ts`). Meta: content type + action only.
- **Not built / open:** premium users are not exempt (isPremium is always false, §87); SSV; offline playback; moving Stories to `main` and `production` (later phase, selected commits only).

## 145. 2026-11-15 — Stories on Home, backend: `develop` only, switches OFF

**Since 2026-11-15/16 live in production, `STORIES_HOME_ENABLED` ON (`STORY_LINK_LANDING_ENABLED` not set) — see §147.**

Commits `develop` `db405aa` (preview rules), `3eebdbb` (gate + `preview`), `3c6a2ac` (first-10 slot), `c53fda0` (landing flag); pushed, dev deploy checked. No migration, nothing on `main` or production, no app code yet. Design: the Stories-on-Home investigation of 2026-11-15 (the plan doc's "Part 2" was not on disk when this was built).
- **Gate** (`src/services/storyHome.service.js`): Home's own request (unfiltered `GET /feed?sortBy=weighted`, `isHomeRequest`) adds stories only with header **`X-Stories-Capable: 1`** (exactly `1`; sent only by app code that can show a story card — an OTA can't change `X-App-Build`) **AND** Railway `STORIES_HOME_ENABLED` (exactly `true`, trimmed, any case). Rows added: series rows with ≥1 active episode and single stories with audio; never episodes (no `series_id`, no `episode_number`), never retired rows. **`HOME_FEED_TYPES` is unchanged** (it is also the default for trending, plain search and `/tags/popular`). Gate closed = the same query, ranking and response, no extra query (tests compare against the no-header baseline; dev check identical).
- **`preview`** on those rows, and on `GET /feed/:id` for a series row or single story under the same gate: `{feedId, episodeNumber, url, duration}` or `null`. Same for everyone, from the settings only (`previewEpisodeOf` / `isSingleStoryPreviewable` in `storyLock.util.js`, built on `computeSeriesStates` with no unlocks): lock on → the first episode free by `free_episodes`/`ad_gated`/position (an ad-unlocked episode doesn't count); single story only if `ad_gated = false`; lock off → the first episode / the story itself. Computed from raw paths before the lock step; a link is signed only for that free episode. Episodes and other types never get the field. Series rows keep `episodeCount`, `freeEpisodes`, `unlockedCount` (lock on).
- **Ranking:** `'stories'` added to `HOME_TOP_TYPES` (§119) — the best-ranked story is always in the first 10; with no story candidates the slot is skipped (identical to before). A series row has no media type: weight = deity × 1 (no media-type factor), never counts toward a media-type run or the ≤7 cap (it breaks a run); deity runs/weights apply. Campaigns: `target_type='type', target_key='stories'` boosts all stories; a tag campaign boosts one series (give the series its own tag). Only Home sends an unfiltered weighted request (checked on app `dev` and `production`).
- **Flag:** `storyLinkLandingEnabled` in `GET /feature-flags`, from `STORY_LINK_LANDING_ENABLED` (exactly `true`; missing = off; no database) — **unused by every app build** (§152). `STORIES_HOME_ENABLED` is not served (the server decides alone).
- **Turning it on (dev):** Railway → development → `bhav-bhakti-be` → Variables → `STORIES_HOME_ENABLED` = `true` (redeploys). Apps without the header still see the old Home; the app side (header, story card, landing) is not built yet.
- **Known:** after the lock step a locked single story has `url: null`, so `attachEpisodeCounts` (`isSeriesRow` reads a missing url) gives it `episodeCount: 0` — pre-existing, harmless; the app reads `mediaType`.

## 146. 2026-11-15 — Story page + Home story card, app side: frontend `dev` only

**Since 2026-11-15/16 live in production (OTA) — see §147.**

Commits `dev` `c195465` (header, `storyKind`, preview type), `8c7e921` (story page), `35ce7d6` (Home card + Listen queue), `ab90500` (player series name, `entry`, tracking). Not on `production`; phone test pending; no OTA run. Plan: Ad-Lock Plan doc Part 2 (§11–§18).
- **Header:** `apiClient` sends `X-Stories-Capable: 1` on every request. Home gets story rows only while backend `STORIES_HOME_ENABLED` is on (§145); off = the app behaves exactly as before.
- **`storyKind()`** (`src/features/stories/storyLock.ts`) is THE rule for series / single / episode: episode = series id or episode number; single = neither + a media type; series = neither + no media type. Never a missing url (a locked single story has url null and may carry `episodeCount: 0`). `isStorySeries` delegates to it. `parseStoryPreview()` reads `feed.preview`.
- **One story page** (`app/(main)/story-series.tsx`, param `storyId`, old `seriesId` still read): GET /feed/:id (`useStory`); a series loads episodes via `seriesEpisodesQuery` (shared with the Home card's Listen; skipped for a single story); a single story's list is itself (same lock row, unlock flow, queue of one). Single-story header: no count, no "N of M unlocked", no "Episodes" heading. New strings `stories.storyLoadError` / `storyUnavailable`. **Always open it with `openStoryPage()`** (`src/features/stories/openStoryPage.ts`): it sends `storyId`, `source`, `returnTo`, `returnParams` (`''` when none) every time, so nothing stale sticks, and logs `story_page_opened`; rows hand the page's full params to the player so back restores the page with its own back target. The Stories tab now opens the page for single stories too (before: played them directly).
- **Home card** (`src/components/molecules/StoryHomeCard/`): FeedList gives series rows and single stories this card before its "has a media file" check. It is `AutoplayFeedCard` with the new optional `story` option (same 30-second cap, play-when-visible, stop-on-background): the preview url is the audio, **the preview EPISODE id is the cache key**, no background download, Share/Like/views hidden (footer shows "N episodes" or the duration, same height), no view/play counts on a series row, "Story" label + See all → Stories tab, cover/title → story page. `preview` null: cover only, no sound, Play/Listen open the story page (no ad on Home). Every other card renders exactly as before (the tap wrappers exist only on story cards).
- **Listen:** `queryClient.fetchQuery(seriesEpisodesQuery(id))` → player on the previewed episode with the whole series as the queue, returnTo Home; list fails → that episode alone; single story → queue of one. Pure rules in `storyHomeCard.ts`.
- **Player:** an episode shows its series name above the title (shared cache), tap → story page (back = the player's own back; from the story page it simply goes back). Queue hops send `entry=queue`, the end-of-episode auto-advance `entry=auto_advance` (stories only).
- **Events (Firebase only):** `story_home_card_shown {is_single, has_preview}` (first election per card per session), `story_home_card_tapped {target: page|listen, is_single}`, `story_page_opened {source: home_card|stories_tab|player, is_single, series_key}`; `story_episode_started` gains `entry` (home_card_listen | story_page | queue | auto_advance | player_series_name; omitted when unknown). Meta: nothing new.
- **Tests:** `node --test` on `src/features/stories/{storyLock,storyPage,storyHomeCard,storyStrings}.test.mjs` (+ the existing ones); `npx tsc --noEmit` clean. No lint config exists in the repo.
- **Dev test rows (NOT imported by Claude):** `D:\bhav_bhakti_Claude_docs\stories_project\single_story_test_rows_dev_2026-11-15.csv` — csv 9001 "TEST single story - free" (`ad_gated` no) and 9002 "TEST single story - needs an ad", reusing Geeta episode 1's audio and cover, Krishna (4), 172 s. Import on DEV: from `bhav-bhakti-be` (`.env` → `metro`), `npm run import:feeds -- "<that path>"`, type `DEVELOPMENT`. Archive both after testing (`UPDATE feeds SET status = 'archived' WHERE csv_id IN (9001, 9002);` on dev).

## 147. 2026-11-15/16 — Stories live in production (backend, content, app OTA, switches ON)

Everything from §120 and §144–§146 is now on production. Founder-run steps (backup, migrations, imports, OTA, Railway variables) are as reported by the founder; Claude ran the git work, the read-only checks and the push of `main`/`production`/`master`.
- **Backend:** 12 commits on `main`, `db07183`..`5a81e77` (cherry-picks of `develop` with `-x`, prepared on the local branch `stories-prod-prep`, then `main` fast-forwarded and pushed from `b811ab3`). Order kept: backup `backups/2026-11-15-2320.sql.gz` → migrations `20261006000001` and `20261115000001` run on production by the founder from `main` (`migrate-production.js --to 20261115000001-create-story-unlocks.js`; checked read-only afterwards: both in `SequelizeMeta`, 5 new `feeds` columns, `story_unlocks` exists) → push → Railway deploy `06fa64ab` SUCCESS (23:28 IST). After the deploy: `/api/v1/health` 200, feature flags `maintenanceMode: false`, `storyLinkLandingEnabled: false`, `minSupportedBuild: 11`. **Why this order:** the new Feed model selects the new columns (code before migration = broken feeds), and `main`'s old Home had no type filter (stories imported before the new code = every series row and episode on Home).
- **Content (production):** Hanuman Immortal, csv 201–209 (series 201, `free_episodes` 2, tag `strength`, deity 6) and Inside Kurukshetra / Geeta, csv 300–335 (series 300, `free_episodes` 5, deity 4; only episode 321 has a tag, `peace`). Sheets: `D:\bhav_bhakti_Claude_docs\stories_project\hanuman_import_sheet_PRODUCTION_2026-11-15.csv` (exported read-only from dev) and `geeta-paath_import_sheet_PRODUCTION_2026-11-15.csv`. Validated before import: all 45 Storage paths exist (exact match, Hindi names included; Geeta's cover really is `cover.jpg.jpg`), ids free, deities and tags exist, dry parse with the importer clean. Read-only after import: 9 + 36 active rows. Production feed ids differ from dev — match by `csv_id`. Test rows 9001/9002 are dev only.
- **Frontend:** 15 commits, `c039d7c`..`18d5d88`, from the local branch `stories-prod-prep-fe`; `production` fast-forwarded from `1237b5a` and pushed, `master` fast-forwarded to `18d5d88`. JS only (no `package.json`, lockfile, `app.config.js`, `eas.json`, `plugins/` or `android/` change; `tsc` clean), runtime 1.1.0, guest login kept. OTA group `31175792-6ac7-4d0c-8fdd-1bc5c3e092e4`, rolled 10% → 50% → 100%. **Rollback point:** group `16a5a1b5-fce0-4b0c-84b8-20cc2e4515b7` (the previous production update; `npx eas-cli@latest update:republish --group <id>`, check channel `production` and runtime 1.1.0). The Stories tab now replaces Rashifal in the bar on production (§10).
- **Railway production variables:** `STORY_LOCK_ENABLED=true`, `STORIES_HOME_ENABLED=true`; `STORY_LINK_LANDING_ENABLED` not set; `STORY_UNLOCK_DAILY_CAP` not set (default 100).
- **Ad unit:** stories use the existing rewarded unit for now. The stories unit `ca-app-pub-2045583960519339/9002604968` exists in AdMob and goes into `STORY_REWARDED_AD_UNIT_ID` (`src/features/ads/adsModule.ts` line 27, currently `''`) by a later OTA — then AdMob/BigQuery can split story revenue by ad unit (§143).
- **Still open:** Geeta tags (none created on production — never create tags by hand without deciding the keys); the **v12 build** with story deep-link landing, then the soft update (`ANDROID_LATEST_BUILD` 12) and later the hard update (`ANDROID_MIN_BUILD` 12 — **never raise min before v12 is at 100% on Play**, §126); deep-link catalogue stories — done: the catalogue and `contentLink.ts` both handle stories (§151, §152); the Ad-Lock plan's §18 cleanup of the Stories Home switch; archive dev test rows 9001/9002 (`UPDATE feeds SET status = 'archived' WHERE csv_id IN (9001, 9002);` on dev).

## 148. 2026-11-16 — Karna Suryaputra series live in production

- **Content:** series csv 400 ("Karna, the Unclaimed Son"), episodes csv 401–413 (401 = the intro; catalogue episode N = `episode_number` N+1, 13 episodes), `free_episodes` 2 (intro + "The Son in the River"), deity **Others (21** on dev and production — not Surya, by founder decision), no tags, the existing rewarded ad unit (§147). Subtitles approved by the founder 2026-11-16. Imported on dev first, then production: 14 created, 0 errors (founder-reported).
- **Sheets:** `D:\bhav_bhakti_Claude_docs\stories_project\karna-suryaputra_import_sheet_DEV_2026-11-16.csv` and `..._PRODUCTION_2026-11-16.csv` (identical, since Others is 21 in both databases). Source catalogue: `D:\bhav_bhakti_Claude_docs\karna-suryaputra_catalogue.csv` — its `Stories/karna-suryaputra/...` paths and Surya/Krishna deity column were not used.
- **Storage:** `Stories/Karna Suryaputra/` (with a space), audio `Episode N- <Hindi title>.mp3` (`Episode 1- Introduction.mp3`), cover `cover.jpg.jpg`. All 13 audio files distinct by content hash; 128 kbps, 50–167 s.
- **Blank `deity_id` (checked 2026-11-16):** the importer accepts it, Home's mix skips null deity (`trailingRun`, `splitGuaranteedTop`), deity chips ignore it (`deity_id IS NOT NULL`), search still matches titles, story screens don't use deity — but no live feed has a null deity, so "Others" was used as the tested path.
- **Numbering lesson:** when a series has an intro, check that the app's episode numbers match how the audio files are named before building the sheet.

## 149. 2026-11-17 — Download cost reduction (video wallpapers)

- **Why:** Cloud Storage egress ("Download APAC") cost ₹4,000+ in early November (448 GiB billed by mid-month, ~₹9/GiB; spikes followed the Meta install bursts). Cloud Storage **Data Read audit logs**, enabled 2026-11-16 ~00:50 IST, showed: video wallpapers ≈ **73%** of downloaded bytes, ~93% of their reads repeats (same phone, same file, within 10 minutes: tiles looped and re-downloaded, expo-av has no disk cache); `Audio/mantras-extended` ≈ 11% (one file 82.6 MB); static PNG wallpapers ≈ 7%. Read the logs with `D:\bhav_bhakti_Claude_docs\storage_read_report.py` in Cloud Shell (the laptop's service account can't read logs; it can read Cloud Monitoring's daily "Network sent bytes").
- **(a) Files:** the 27 video wallpapers re-encoded (H.264, crf 25, maxrate 1200k, 720 px short side, faststart, AAC **64 kbps mono kept**): 134.3 → 35.8 MB. New files `Wallpapers/Video wallpapers/<Deity>/<name> v2.mp4` (`other/<name> v2.mp4` for feeds 30/31); first-frame JPEG thumbnails `Thumbnails/Video wallpapers/<Deity or other>/<name> v2.jpg` (≤100 KB, 6 detailed ones ≤150 KB). Uploaded create-only (no overwrite), no Firebase download tokens. **Originals stay in place untouched** (old signed links last 72 h); private copy in `media-originals/2026-11-17/` (deny-by-default rules, no tokens). **Delete the old live originals only after 2–4 weeks.** Local working set: `D:\bhav_bhakti_Claude_docs\video_test\` (originals, new, thumbs, `mapping.csv`). ffmpeg 9.0.2 is installed on the laptop (winget `Gyan.FFmpeg`, call it by full path from Git Bash).
- **(b) Database swap:** `scripts/update-video-paths.js` (backend `develop` `9ef8fe5`, `1fe1ed7`; **not on `main`**, run from `develop`): reads `mapping.csv`, matches by `csv_id`, changes only `url` and `thumbnail_portrait_url`; dry run by default, `--target DEVELOPMENT|PRODUCTION` must match the host, `--apply` with typed confirmation, full-row JSON backup in `archive/` first, one transaction, read-back check that nothing else changed; refuses if `feeds` has triggers; `--restore <backup.json>` undoes it with the same safety. Run on dev, then production on 2026-11-17: 27 rows changed; on production id = csv_id (30, 31, 77–181).
- **(c) App:** production OTA, update group `f21805bd-0040-4cdb-a137-43fc0f1d8c7f`, at 100% (runtime 1.1.0, JS only): `production` `3d80a0e`, `a3def7f`, `f477cc5`, `e495181`, `6c0204e` (= `dev` `0ca073b`, `7ac1de7`, `27b6287`, `b3e1670`, `4cb3e02`); `master` = `production` = `6c0204e`. Videos **play once** then stop on the last frame with a replay button (hub grid tiles, Search, Home, Viewing Window); a finished video isn't reloaded by itself in the session (`src/store/finishedVideoStore.ts`, `src/hooks/usePlayOnceVideo.ts`, `VideoReplayButton`, label `feedCard.replayVideo`); Home audio cards **stream the 30-second preview only** (no full background download, no jump-to-start when paused). The app shows the thumbnail via `getFeedThumbnailUrl` (portrait first).
- **(d)** Deep-link catalogue refreshed after the swap (ids and links unchanged; 27 storage paths now `… v2.mp4`).
- **Undo:** database — `railway run --service MySQL -- node scripts/update-video-paths.js --target PRODUCTION --restore "archive\production-video-paths-backup-2026-11-17T11-38-09-104Z.json"` (dry run; add `--apply`, type PRODUCTION; needs `mapping.csv`), then refresh the catalogue. That backup file is **untracked and only on the laptop** — keep it. App — republish the previous production group `31175792-6ac7-4d0c-8fdd-1bc5c3e092e4`.
- **Still open, in order:** (1) re-encode the 4 long mantras (feeds 16–19) at **96 kbps mono** without cutting quality too far, and convert the ~87 static PNG wallpapers to JPEG q82 (check the 7 with transparency) — same safe pattern (new paths, backup, mapping, script); (2) the v12 build: expo-video disk caching (`useCaching`), story deep-link landing; (3) day-stable signed URLs; (4) the CDN question; (5) maybe bring looping back once videos are cached. **Measure** with Cloud Monitoring "Network sent bytes" per active user and the audit logs, 2–3 days before vs after.
- **Lesson:** the egress cost came from repeat downloads of looping videos, not from audio — check the audit-log data before guessing.

## 150. 2026-11-17 — Download cost reduction (audio), Stories ad unit + PG

- **Audio batch (founder: 128 kbps stereo, no mono):** 8 files re-encoded to MP3 128 kbps CBR stereo, LAME quality 0, original sample rate (48 kHz; 44.1 kHz for csv 47, 36, 38), gapless LAME/Info header added, no gain or normalising: csv **16, 17, 18** (`mantras-extended`), **47** (Shiv Chalisa), **23, 36, 24** (bhajans), **38** (Sukhkarta Dukhharta aarti); **csv 19 left as is** (already 128k). 182.8 → 73.4 MB (−60%). Lengths identical to the millisecond, full decode clean, loudness ~0.4–0.5 dB lower (128k drops the top frequencies; no gain change). **Tags and cover art kept byte-for-byte:** the audio is encoded without tags and each original's ID3v2 block (cover art included) and ID3v1 tag are spliced back unchanged — ffmpeg's own tag copy drops `WCOP`, rewrites `COMM` and regenerates ID3v1. Local working set: `D:\bhav_bhakti_Claude_docs\audio_test\step_b\` (originals, new, `mapping.csv`, the production backup copy); listening samples from the earlier A/B test in `audio_test\samples\`.
- **Storage:** `<same folder>/<original name> v2.mp3`, create-only, `audio/mpeg`, Cache-Control `public, max-age=31536000`, no download tokens. **Originals untouched in place**; copies in `media-originals/2026-11-17/<same path>` (no tokens). Delete the old live originals only after 2–4 weeks (phones keep a played file for 14 days, keyed by feed id).
- **Database:** `scripts/update-video-paths.js --kind audio` (backend `develop` `1d69548`; `--kind video` is the default and unchanged): mapping `csv_id,dev_id,old_url,new_url` (`.mp3`), changes **only `feeds.url`** — the UPDATE sets url alone and the read-back check requires every other column, thumbnail included, to be unchanged (all 8 rows have thumbnails). Same safety as video (§149); backups are named `*-audio-paths-*` and record their kind; `--restore` refuses a backup of the other kind. Applied on dev, then production on 2026-11-17: 8 rows; production id = csv_id (dev ids 45/47/56 for csv 36/38/47). Deep-link catalogue refreshed after the swap: 172 feeds written; checks passed (8 ` v2.mp3` and 27 ` v2.mp4` paths; ids and deep links unchanged); the founder replaced the file in the Meta Ads project.
- **Audio undo:** `railway run --service MySQL -- node scripts/update-video-paths.js --kind audio --target PRODUCTION --restore "archive\production-audio-paths-backup-2026-11-17T13-43-51-435Z.json"` (dry run; add `--apply`, type PRODUCTION; needs the mapping file), then refresh the catalogue. The backup is untracked; a copy is in `audio_test\step_b\`.
- **Ads OTA (same day):** `dev` `f865fec` → `production` `f6a99bd` (JS only, runtime 1.1.0); `master` = `production` = `f6a99bd`. `STORY_REWARDED_AD_UNIT_ID` = the Stories unit `ca-app-pub-2045583960519339/9002604968` (story unlocks: first ad, retry and preload use placement `'story'`; wallpaper/ringtone unlocks keep `…/8937270797`; only the production app uses real ids, every other variant Google's test unit); `maxAdContentRating` G → **PG** (set in code, it overrides the AdMob console, both units); child-directed / under-age flags still false.
- **Still open (audio):** other files over 3 MB — csv 25 (Laxmi Mata Bhajan, 18.3 MB, 192k), 21, 32, 33 (192k), 22, 29, 37, 28, 26 (160k) — same pattern if downloads justify it (check their share with `storage_read_report.py`). The rest of §149's list stands (static PNG → JPEG, v12 with video caching, day-stable signed URLs, CDN).
- **Lessons:** to keep MP3 tags exact, splice the original tag bytes instead of letting ffmpeg copy them; LAME quality 0 is slow (a 36-minute file takes minutes) — run long encodes in batches that finish well inside the 10-minute tool limit.

## 151. 2026-11-18 — Story links for v12 (pin + page form), safe audio cache, notices, v12 bump

*Also today (not logged elsewhere):* frontend `production` = `master` = `1a1c274` (six JS commits from `dev`: `.part`-then-rename audio cache `safeDownload.ts`, centred cream `AppNotice` for "Saved to gallery" and the ringtone steps, dark Viewing Window; tag `v11-final` = `f6a99bd`); `dev` `1ed267d` installs expo-image ~3.0.11 / expo-video ~3.0.16 (unused, no plugin entry) and `eeb600e` bumps to **version 1.2.0 (new OTA runtime), versionCode 12 / `.dev` 7** — so `dev` OTAs reach only `.dev` build 7, and nothing from `dev` after `c4cce42` may go to `production` before the v12 release. Plan: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_v12_Caching_Plan_2026-11-18.md`.

**Story links (founder decisions 2026-11-18):** two link forms, the co-founder picks one per ad: **pin** `bhavbhakti://open/stories/<id>` (story first on Home) and **page** `bhavbhakti://story/<id>` (opens the story page; back → Home). **No server switch** decides or disables either (`STORY_LINK_LANDING_ENABLED` left untouched and unread). **Links opened while the app is running are NOT handled** (later OTA); cold start, fresh install and "app opened by a link while closed" are.
- **Backend `develop` `2f51ea4`** (not on `main`): the catalogue lists `stories` rows (series with ≥1 active episode, path = cover; active single stories with audio; never episodes or retired rows) and two new columns at the end, `pin_link` and `page_link` (`deep_link` unchanged, = `pin_link`; `page_link` blank for other types). Checked read-only on dev: 3 series + 2 single stories, 56 episodes skipped. Lookup instructions doc updated (stories section). **Use page links in ads only once v12 is at 100% on Play** (older apps ignore the page form → normal Home). The production catalogue has listed story rows since 2026-11-19 (§152).
- **Frontend `dev`** (in the v12 build; not on `production`): `c888be5` parser (`kind: pin|page`, `stories` type; page form = exactly host `story` + id; pending-link store keeps `kind`, a stored link without one reads as pin; probe reports route `story`); `e33abbb` Home pin accepts a story series (no url) and a single story (url null when locked), episode = wrong type (`pinStoryKind` mirrors `storyKind`, a test checks they agree); `371c83d` one link decision in `useHomePin` for both forms — page form needs no flag, opens via `openStoryPage` (source `link`, id from the API answer) only if Home is in front; pin form still needs `deferredLinkPinEnabled` and behaves as before; `adde91c` events — Firebase `story_link_landed {kind: pin|page, result: opened|not_found|type_mismatch|expired|error}` (story links only; page reports `opened` only when the page really opens) and Meta `story_play_started {content_type: stories, action: listen}` (production app only, with `story_episode_started`, once per feed id + play request). The general ad events and existing deferred-link events are unchanged. `listen` now also means "a story starts playing" (§134).
- **Note:** the link decision now runs on every Home mount (code constant `DEFERRED_LINK_PIN_ENABLED`), also when the pin flag is off: a brief Home spinner while the pending link is read, and on an install under a day old up to 2 s waiting for the Meta probe. The pin flag is ON in production, so nothing changes there.
- **Tests:** app 119 (`node --test`), backend 41 suites / 900 (`jest`); `tsc` clean. Phone checks on `.dev` build 7 with `adb shell am start -a android.intent.action.VIEW -d "bhavbhakti://story/<id>"` after `adb shell pm clear com.orivori.bhavbhakti.dev`; the real Meta deferred path only on a production build.

## 152. 2026-11-19 — v12 live on Play Production; master and tag; catalogue story rows on `main`

- **v12** (version 1.2.0, versionCode 12, new OTA runtime 1.2.0) is live in Play Production (founder-reported 2026-11-19; Claude didn't check Play). Contents: §151 (story links, pin + page form) plus the video/image caching work on `dev` (expo-image/expo-video, `FeedImage`, `FeedVideo`, `src/utils/videoCache/`, `imageCacheKey`). Frontend `production` = `adeeee0`; **`master` fast-forwarded `1a1c274` → `adeeee0`** and pushed; annotated tag **`v12`** = `adeeee0`, pushed.
- **Backend:** `develop` `2f51ea4` (catalogue story rows, `pin_link`/`page_link`) cherry-picked with `-x` onto `main` as **`7a1b707`** (only `scripts/export-deeplink-catalog.js` + its test; the API never loads it). `ceb76a4` (CLAUDE.md) not picked. `main` tests: 40 suites / 831 passed. Pushed `5a81e77..7a1b707`; Railway production deploy `57845dcb` SUCCESS (behaviour unchanged). The catalogue script on backend `main` (7a1b707) includes story series (pin_link and page_link). A fresh production export on 2026-11-19 19:18 IST had 175 rows including 3 stories (Hanuman 182, Geeta 191, Karna 227) and matched the founder's 02:31 file.
- **`storyLinkLandingEnabled`** is sent by the backend (`GET /feature-flags`, from `STORY_LINK_LANDING_ENABLED`) but **no app build reads it** (checked v12 `adeeee0` and `1a1c274`). Story page links (`bhavbhakti://story/<id>`) need no flag in v12; pin links need `deferredLinkPinEnabled` (ON in production). The backend comments say so since `develop` `3936e90` (comments only, not on `main`); the flag is a candidate for removal.
- **Tags:** `runtime-1.1.0-final` = `1a1c274` (pushed 2026-11-19; the base for emergency fixes to v9–v11 phones); `v11-final` stays at `f6a99bd`; `v12` = `adeeee0`.
- **OTA runtime rule (two runtimes now):**
  - `production` (1.2.0) OTAs reach **v12 phones only**.
  - v9, v10 and v11 phones run runtime **1.1.0**; their newest code is **`1a1c274`** (the six JS commits of §151 on top of `f6a99bd`). An emergency fix for them: branch off `1a1c274`, apply the fix, and publish from that branch to runtime 1.1.0 (the founder runs it; the production safety script only allows `production`, so that run needs its own decision). **Do not branch off the `v11-final` tag** — it points at `f6a99bd` and would roll those phones back by six commits. Every 1.1.0 rule still applies (guest login must be in the branch, §139).
  - Nothing from `dev` may go to a 1.1.0 branch if it needs a native module that only v12 has (expo-image, expo-video).
- **Not done (founder decisions):** no OTA run; no Railway variable touched; `ANDROID_LATEST_BUILD` / `ANDROID_MIN_BUILD` unchanged (raise min only once v12 is at 100% on Play, §126).

## 153. 2026-11-19 — Rashifal ad gate (backend `develop`, app `dev`); switches OFF

Founder decisions 2026-11-19: one rewarded ad unlocks **one zodiac sign for the rest of the IST day**; all signs gated (own sign too); the daily push stays general; lock icons on the grid; no ad available = unlocked silently as `no_fill` (never a reward, no retry, no notice); no separate Rashifal ad unit yet. Accepted: a guest who reinstalls or clears data is a new guest, so their unlocks are lost.
- **Backend** (`develop` `f0157e7`, `5c295bb`, `5c4def5`, `fa0a74a`, `25e15e2`; on `main` since §156):
  - Table `rashifal_unlocks` (migration `20261120000001`, model `RashifalUnlock`): user_id (deleted with the user), zodiac_sign, reading_date (the IST date), source `reward` | `no_fill`, granted_at, expires_at (next IST midnight, information only), client_build, ad_transaction_id (empty until SSV); UNIQUE (user_id, reading_date, zodiac_sign) = at most 12 rows per user per day, so no daily cap.
  - **The gate applies only when ALL hold:** `AD_UNLOCK_ENABLED` (the existing ads master, ON in production) **and** `RASHIFAL_AD_GATE_ENABLED` (exactly `true`) **and** headers `X-Ads-Capable: 1`, **`X-Rashifal-Unlock: 1`** (sent only by app code with the unlock prompt — a v12 phone on older JS sends build 12 but must never be gated) and `X-App-Build` ≥ 12. Optional `RASHIFAL_GATE_MIN_BUILD` (whole number; unset/junk = 12) lowers the build minimum — **dev only** (`.dev` is build 7); never set it on production. Rules: `src/utils/rashifalLock.util.js`; service `src/services/rashifalLock.service.js`.
  - Reading endpoints `GET /horoscope/today/:sign` and `/horoscope/date/:date?zodiacSign=`: the gate runs **only after the reading is found** (missing reading = the normal 404, never a prompt); locked → 403 `PREMIUM_REQUIRED` + `unlock: 'ad'` + `scope: 'rashifal'` + `rashifal: {zodiacSign, date}`; allowed when an unlock row exists for that user + sign + **the reading's date** (so a reading left open past midnight stays readable), or premium (always false, §87). The public `/today/:sign` reads the token only while the gate applies (`src/middlewares/optionalAuth.middleware.js`); any token problem = old public behaviour. With no `date`, `getPublicHoroscope` now uses **IST** today (`getIstDateString`), not the server's time zone. Log `[rashifal-gate] denied …`.
  - `POST /api/v1/rashifal-unlocks` `{zodiacSign, source}` (login, 20/min per user): gate off → 403 `RASHIFAL_GATE_DISABLED`; today's IST reading missing → 404 `NO_READING` (nothing written); already unlocked → 200, nothing written (also a reward after a no_fill; a lost race answers 200); else 201. Log `[rashifal-unlock] user= sign= date= source= build= result=`. `GET /api/v1/rashifal-unlocks/today` (login) → `{date, gateActive, signs[{sign, unlocked, available}]}`; `gateActive: false` (no database query) when the gate doesn't apply or for premium.
- **App** (`dev` `bfbda91`, `98d653c`, `bdef33b`, `afdc3f7`, `b55f9bf`; JS only; not on `production`): `src/features/rashifal/` — `rashifalLock.ts` (pure rules + `rashifalLock.test.mjs`), `rashifalUnlockApi.ts`, `rashifalUnlockFlow.ts` (existing opt-in card/loading/media pause; placement 'media'), `useRashifalOpener.ts` (Home card and grid: read status → prompt only for a locked sign that has a reading → open after unlock; decline stays put; gate off or status failure = open as before), `useRashifalReading.ts` (no date sent; served date pinned for the visit; no retries on 401/403/404). `apiClient` sends `X-Rashifal-Unlock: 1`. `horoscope-detail.tsx`: a locked answer offers the ad once per visit (trigger `notification` | `reading_screen`), then a locked panel with "Watch ad to read"; a reading already on screen is never replaced by a later error. Grid: small lock on signs not unlocked today (status re-read on focus). Home card: birthdate modal first when needed; cancelling it does nothing. A push to `horoscope-detail` adds `entry=notification`. Strings `rashifalLock.*` (en/hi).
- **Events (Firebase):** `rashifal_lock_shown`, `rashifal_unlock_completed {source}`, `rashifal_opened_unlocked` (trigger `home_card` | `sign_grid` | `notification` | `reading_screen`; `is_own_sign` only from Home's card); `gate_action_tap {action: view, content_type: rashifal}` + Meta umbrella `gate_action_tap`; shared ad events with `content_type: rashifal`, `action: view`. `rashifal_viewed` unchanged.
- **Dev data:** 48 TEST readings (12 signs × en/hi × 2026-11-19 and 2026-11-20, `source = 'manual'`) seeded by a one-off scratchpad script. Delete in HeidiSQL on dev: `DELETE FROM daily_horoscopes WHERE overall_prediction LIKE 'TEST %' AND source = 'manual' AND date IN ('2026-11-19', '2026-11-20');` (48 rows). The dev test needs `AD_UNLOCK_ENABLED`, `RASHIFAL_AD_GATE_ENABLED` and `RASHIFAL_GATE_MIN_BUILD=7` on Railway dev.
- **Not touched (founder: leave them):** `horoscope.controller.js` reads `req.user.userId`, which `authenticate` never sets (the logged-in horoscope routes the app doesn't use are broken); `validate()` commented out on two horoscope routes; `/horoscope/all-signs` is public.

## 154. 2026-11-19 — Rashifal cron: retry every 30 minutes at night, alert only from 05:05 IST

- **Findings (read-only):** production service `Daily_Horroscope`: cron `45 18 * * *` UTC (00:15 IST), start `node scripts/generate-daily-horoscopes-gemini.js`, Dockerfile, restart policy NEVER; Railway starts cron runs up to ~4½ min late. Last nights: all 24 rows by 00:30 except **13 Nov (21/24 all day — capricorn/hi, pisces/en, pisces/hi never created)** and **19 Nov (21/24 until a manual redeploy run at 01:04)**; every failure was Gemini HTTP 503 "high demand". **A deploy (push to `main`) does NOT start a run** (checked 19 Nov; this corrects §5's "redeployed with every push" — it redeploys, but doesn't run).
- **Change** (`develop` `900391a` → `main` `5b57ebb`, deployed 23:08 IST): exit code decided by the run's **IST start time**: all present → 0; hard fault (bad key/model, database) → 1 at once; missing and started before 05:05 IST → logs `STILL MISSING … Not alerting … will retry at the next run`, exits 0; missing and started at/after 05:05 IST (the last night run, or any later run) → 1 (the one alert email). Optional `HOROSCOPE_ALERT_FROM_IST=HH:MM`; unset/invalid = 05:05. Helpers `parseIstClock`, `istMinutesOfDay`, `isAlertRun`, `decideExitCode`, tested in `scripts/__tests__/generate-daily-horoscopes-gemini.test.js`.
- **Schedule to set (founder, Railway → production → Daily_Horroscope → Settings → Cron Schedule):** `15,45 18-23 * * *` UTC = 23:45 IST (previous day: 0 calls, or a last try for the ending day) then 00:15 → 05:15 IST every 30 minutes. **Until it is set, a failed 00:15 run neither retries nor alerts.** Runs never overwrite (`findOrCreate`) and a run with all 24 present makes 0 Gemini calls; overlapping runs are harmless. Model `gemini-3.5-flash-lite`; paid output stays ~24 readings a night.

## 155. 2026-11-19 — Push tracking (app `dev`, backend `develop`); Firebase only

Before this: no `notification_*` events in BigQuery since the export began (29 Oct) and the app logged nothing on a push tap, so push → return → Rashifal couldn't be measured. Founder decisions: exact `access` value via a backend field; the daily push opens the grid with `campaign = rashifal_daily`; no A/B holdout now.
- **Backend** (`develop` `d97c16a`; on `main` since §156): the reading response gains `rashifalAccess` = the gate's reason (`gate_off` | `client_not_gated` | `no_user` | `unlocked` | `premium`); additive, the reading is otherwise unchanged (serialised via `toJSON`).
- **App** (`dev` `3212671`, `eaf41b9`, `f638551`; JS only):
  - `notification_opened {campaign, target, app_state}` in both handlers of `app/_layout.tsx` before navigating: campaign from the push data (lower case, `a-z 0-9 _ -`, ≤40 chars, missing = `none`); target = the allow-listed screen (`horoscope`, `horoscope_detail`, `home`…), `invalid`, or `blocked` (maintenance / forced update; a blocked cold tap is still counted, never navigated); app_state `cold` | `background`. Pure rules in `src/utils/notifications/pushAttribution.ts` (+ `.test.mjs`; the allow-list moved there from `deepLink.ts`).
  - "Opened from push <campaign>" is kept **in memory only, 30 minutes from the tap**, gone on every cold start; never stored. While set, `push_campaign` is added to `rashifal_viewed`, the three Rashifal gate events, the Rashifal `gate_action_tap` and the Rashifal ad events (Firebase only; Meta still gets content_type + action). No event's timing or count changed.
  - `rashifal_reading_shown {access, push_campaign?}` once per visit and sign when the reading actually shows: `gate_off` | `ad` | `no_fill` | `already_unlocked` | `premium` (`rashifalReadingAccess` in `rashifalLock.ts`; the opener passes `unlockedVia`, the flow returns its source). Missing field (older backend) = `gate_off`.
  - Firebase user property `notif_permission` = `granted` | `denied` | `not_asked` (Android 13+ before our one dialog), set every cold start and after the dialog is answered (`syncNotificationPermissionProperty` in `permission.ts`).
- **Push setup (founder):** Firebase Console → custom data `screen = /(main)/horoscope`, `campaign = rashifal_daily`. Register `campaign`, `target`, `app_state`, `push_campaign`, `access` as custom definitions to see them in Analytics reports (BigQuery has them anyway). DebugView: `adb shell setprop debug.firebase.analytics.app com.orivori.bhavbhakti.dev` (off: `.none.`).

## 156. 2026-11-19 — Rashifal backend released to production (switches OFF)

- **Order kept:** founder's "Run now" backup `backups/2026-11-19-2342.sql.gz` (1.51 MB) → local `main` cherry-picks with `-x` (all clean): `f0157e7`→`8ad1063`, `5c295bb`→`eae0e62`, `5c4def5`→`21c6d66`, `fa0a74a`→`4a65cfb`, `25e15e2`→`acbe3a9`, `d97c16a`→`d2201bb`; full test run 44 suites / 917 passed → founder ran `migrate-production.js --to 20261120000001-create-rashifal-unlocks.js` (migrated, 2.7 s) → read-only check: 9 columns, UNIQUE `uq_rashifal_unlocks_user_date_sign` (user_id, reading_date, zodiac_sign), FK user_id → users CASCADE, 0 rows, listed in `SequelizeMeta` → push `5b57ebb..d2201bb` → API deploy `a8e03c65` SUCCESS (23:49 IST).
- **Verified after deploy:** `/api/v1/health` 200; `/feature-flags` byte-identical to before; `/rashifal-unlocks/today` and `POST /rashifal-unlocks` → 401 without login; `/horoscope/today/aries` (en and hi) returns the normal reading for 2026-11-19 plus `rashifalAccess: gate_off` (= the Rashifal switch is off; variables were not read).
- **Not done:** the frontend (§153/§155) — cherry-pick onto `production` in this order, all checked clean: `bfbda91`, `98d653c`, `bdef33b`, `afdc3f7`, `b55f9bf`, `3212671`, `eaf41b9`, `f638551` (JS only, runtime 1.2.0, reaches v12 only), then the OTA; the switch `RASHIFAL_AD_GATE_ENABLED` only after that.

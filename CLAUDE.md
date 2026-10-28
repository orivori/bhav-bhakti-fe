# Bhav Bhakti — Project Context

*Last verified against actual code/config: 2026-10-22 (§110–§127 each checked against the commits and branches, and where relevant the databases, the Storage bucket, Railway deploys and Crashlytics; the rest last had a full staleness pass on 2026-09-29). §128 (2026-10-23) recorded from the founder's rotation work and today's commits. Last condensed 2026-10-23 (ninth pass — see the archive's note of that date). Newest, on dev/develop only (NOT production): §120 Stories phases 1–5. Newest on the `production` branch, OTA pending: §129 A1 counter default 11 + baseline events (2026-10-28). Newest live in production: §128 Railway incident — every secret rotated (2026-10-23); §127 Search and video fixes (2026-10-22); §126 update-available prompt (off until its Railway variables are set); §125 video-memory fix; §124 v8 live on the Play Store (2026-10-11). Earlier production work: §110–§123.*

*Still-open items carried forward:* **Media Stage 2 paused** (WebP variants and thumbnails, §125); **v9 scope** (at least expo-image and native crash symbols, §125). **Revenue:** the Revenue Model and the roadmap live in `D:\bhav_bhakti_Claude_docs` (`Bhav_Bhakti_Revenue_Model.md`, `Bhav_Bhakti_Roadmap_2026-10-15.md`); AdMob (Model 2), chosen 2026-10-15, is **the next build** (Revenue Model §5c, Roadmap). **§87 — `isPremium` is permanently `false` for every user** (the Premium pipeline's frontend, wiring up the already-built `GET /subscription/status`, was never built) — HIGH PRIORITY for the next Premium session. **Security audit:** every group is complete. Group 4 is 9 of 10 — step 7 (App Check) deliberately skipped and permanent Firebase download tokens accepted as-is, no rotation (founder decisions, §112); Group 7 done apart from the Expo SDK 54→57 upgrade, parked as its own future project (§114). `Bhav_Bhakti_Security_Audit_Plan.md` is authoritative. **Docker images (§128):** `.dockerignore` excludes `package-lock.json`; the API `Dockerfile`'s `HEALTHCHECK` calls `/health`, which 404s — noted only. **Play Console:** the Data Safety form, the Advertising ID declaration and the foreground-service declaration are done; v8 live (§124). **Content (§110/§111):** the import sheet must be brought in line with production before any re-import, or it undoes the dedupe; the Feed TEMPLATE CSV's example row points at deleted files (§112). **Product decision pending:** audio "views" vs "plays" (§113). **Claude never runs an OTA update, dev or production — the founder runs every one (§111); no device testing unless explicitly asked (§113).** **§85 is the standing branch workflow:** everyday commits on `dev`; `production` receives only cherry-picks from `dev` once tested; real production pushes only from `production` (`npm run update:production`); `master` fast-forwarded from `production` once confirmed live.

*Condensing history:* this file was condensed on 2026-07-29, 08-13, 08-20 (twice), 09-10, 09-14, 09-29, 10-05 and 10-23. The full original text of every condensed or rewritten section is preserved in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 1. Project overview

Bhav Bhakti is a devotional content app: wallpapers, ringtones, daily horoscopes (Rashifal), and a social "feed" of devotional content (mantras, etc.).

Two sibling repos live under this parent folder (`D:\bhav_bhakti`, which is **not itself a git repo** — only the two subfolders below are):
- `bhav-bhakti-fe` — Expo / React Native frontend (Expo Router, TypeScript, Zustand; `expo-audio` for audio, `expo-av` still used for video). GitHub: `orivori/bhav-bhakti-fe`.
- `bhav-bhakti-be` — Express / Sequelize backend (MySQL). GitHub: `orivori/bhav-bhakti-be`.

**Founder context:** solo, non-technical founder. No dev team — all implementation work goes through Claude Code. When a decision has technical tradeoffs, explain them in plain language before the founder has to choose.

## 2. Backend infrastructure

**Database:** MySQL, hosted on Railway since 2026-08-25 (§64) — production and a separate development environment (§96), each with its own database. **Local development does NOT use `localhost`:** `bhav-bhakti-be/.env`'s `DB_HOST` points at a Railway database — the development environment's (`metro.proxy.rlwy.net`) since 2026-09-24; before that it was silently production's (`shinkansen.proxy.rlwy.net`) while saying `NODE_ENV=development` (§97). Always check `DB_HOST`, never `NODE_ENV`, to know which database a local script will hit — database-writing scripts enforce this via `scripts/confirm-db-target.js` (§97). The `dev`/`start` npm scripts run plain `nodemon`/`node`. Railway builds the API from the repo's `Dockerfile` (and the backup cron from `Dockerfile.backup`, §99); `docker-compose*.yml` and `DEPLOYMENT_GUIDE.md`'s old AWS EC2 plan still exist but are unused.
- **18** Sequelize models in `src/models/` (2026-09-29): DailyHoroscope, Deity, Feed, FeedDownload, FeedLike, FeedShare, FeedTag, HoroscopeFeedback, HoroscopeReadHistory, LoginHistory, OTPLog, Payment, Subscription, SubscriptionEvent, Tag, User, UserProfile, UserZodiac. (Category and FeedMedia were removed by the feeds redesign, §104; the 4 Quiz models by §101.)
- **53** migration files in `src/database/migrations/` (the newest, `20260930000001`, created the ranking tables, §111). Railway deploys never run migrations — they're run by hand (production via `scripts/migrate-production.js`, §104; dev via `railway run` with the dev-scoped token).

**Media storage:** Firebase Cloud Storage, bucket `bhav-bhakti.firebasestorage.app` (migrated from AWS S3, `67c303b`). Uploads go through `src/services/uploadService.js` (a custom `FirebaseStorageEngine` with Sharp optimization); every upload/delete route is admin-only (§97). Feeds store Storage **paths**, not URLs (§104), and since §108 every feed response returns V4 signed URLs that expire after 72 hours.
- `storage.rules` (the repo copy matches what's live; locked 2026-09-30, Group 4 step 10, §112): deny by default — no client `get`, `list` or write anywhere — except `FCMImages/` (push-notification images), which allows `get` by exact path. `backups/` stays private under the default deny. The app is unaffected, because it only uses backend-signed links; those, permanent download tokens and the Admin SDK all bypass the rules. Only bare token-free `firebasestorage.googleapis.com/...?alt=media` links stop working. **The `.dev` and production apps share this one bucket, so any rules change is live for both at once** — test in the Storage emulator first (§112). Rules are published by the founder in Firebase Console; Claude Code can't publish them.
- Service account key `src/config/firebase-service-account.json`: gitignored (`.gitignore` line 6) and not tracked — re-check before every commit. On Railway the credentials come from a base64 environment variable instead (§64).

**Auth:** Firebase Phone Auth is the only login path (§43/§45): the backend verifies the Firebase ID token, then issues its own JWT (10-day expiry). The old OTPless code and the master-OTP bypass were deleted outright (§45). Production's `JWT_SECRET` was rotated off the `.env.example` placeholder on 2026-09-24 (§97).

**AWS leftovers** (low priority — don't proactively fix): the unused `aws-sdk`, `@aws-sdk/client-s3` and `multer-s3` packages were removed in Group 7 step 4 (§114). Still left: `S3_SETUP_INSTRUCTIONS.md` is a stale S3-era doc, and unused `AWS_*`/`OTPLESS_*` environment variables are still set (audit plan's "still open, small" list). (`scripts/optimize-s3-assets.js`, `scripts/S3_OPTIMIZATION_GUIDE.md` and `profile.controller.js`'s host-string storage-cleanup branch are gone. The old "legacy CloudFront URLs in `FeedMedia`" trap is gone too: `feed_media` was merged into `feeds`, and every stored path was extracted from a Firebase URL, §104.)

## 3. Content ingestion

**There is still no admin panel, dashboard or CMS in either repo.** Content is added with `npm run import:feeds` (`scripts/import-feeds-from-csv.js`), which writes `feeds`/`feed_tags` directly via Sequelize, bypassing the API. Since the feeds redesign (§102/§104) it takes a single sheet (template: `bhav-bhakti-be/Content Upload Sheet - Feed TEMPLATE.csv`), requires `id` and `url` on every row, converts each Firebase URL to a Storage path, and does find-or-update on `csv_id` (§50). It asks for a typed confirmation of the target database first (`confirm-db-target.js`, §97).

The API route (`POST /upload/media`, then `POST /feed`) still exists but is admin-only on both: `POST /feed` has had `authenticate` + `requireAdmin` since `bfb3a51` (2026-09-24, merged to production `main` via `1ca0f5e`, §100). No production account has `role = 'admin'` (deliberately deferred, §97), so in practice this route is unused. `POST /feed` still hardcodes user 1 as the owner of every new feed (§100).

**Content-management tooling — undecided since 2026-07-19, pending a co-founder discussion:** (a) keep improving the CSV importer (cheapest; no edit/delete after import); (b) a minimal custom admin upload form calling the existing upload + create-feed endpoints (would need a real admin account); (c) Directus as a full CMS over the MySQL schema (~1–2 days; structural changes must still only ever happen via Sequelize migrations, never Directus's Data Model UI, or the ORM and live schema drift). Don't assume any of these has been built — confirm with the founder. The original option-by-option analysis is archived.

## 4. Frontend display — content screens

**Where real Feed data is shown:** Home (`index.tsx`, viewport-autoplay `AutoplayFeedCard`, §30); the Audio hub (`ringtones.tsx` — Ringtones/Aartis/Bhajans sub-tabs, §21/§27/§60); the Wallpaper hub (`daily-status.tsx` — Status/Thought/Wallpapers sub-tabs, §23/§33/§61); Mantra Explorer (`mantras.tsx`, §56); Search (`search-results.tsx`, §59); and the full player (`audio-player.tsx`, `expo-audio`, §57/§58).

**Orphaned:** `wallpapers.tsx` still renders static `src/data/mockWallpapers.ts`, and nothing navigates to it (§10). It is unrelated to the working Wallpaper hub in `daily-status.tsx` — don't conflate the two. (`wallpaper-detail.tsx` was deleted in §53.)

**Title and subtitle:** `Feed.title` and `Feed.subtitle` are both bilingual (`{en, hi}`). `subtitle` replaced the old single-language `caption` in the feeds redesign (§102/§103) and is shown in the current language — settling the old "build out or remove `caption`" question.

## 5. Horoscope engine

Daily Rashifal content is AI-generated: `scripts/generate-daily-horoscopes-gemini.js` generates English with Gemini (`temperature: 1.4`, §90), then translates that exact content into Hindi (§55). A Railway cron runs it nightly with `TZ=Asia/Kolkata` (§66) — in production that's the service renamed "daily horoscope" on 2026-10-23 (formerly Railway's auto-generated `alert-transformation`, §128), which redeploys alongside `bhav-bhakti-be` on every push to `main`. The old third-party APIs (Aztro, horoscope-app-api) and their static fallback were removed (§40). `astrology.service.js` does real western zodiac-sign calculation from date of birth; Vedic details (moon sign, ascendant) are still stubbed (`// TODO: Future enhancement - call Vedic astrology API`, line 57).

## 6. Known resolved issues (history only — don't redo these)

- **Seeder JSON bug** — fixed (`bhav-bhakti-be` `15c2b0a`): multilingual JSON columns need values like `JSON.stringify({ en: ... })`.
- **AWS S3 → Firebase Storage migration** — `67c303b`, confirmed end-to-end 2026-07-18 (AWS package cleanup was separate, §2).
- **Feed title/caption mismatch** — fixed (`bhav-bhakti-fe` `4e65b55`): resolve `feed.title[language] || feed.title.en`, never `feed.caption`. `caption` was later replaced by the bilingual `subtitle` (§4). `MantraCard.tsx` is dead code.
- An original infrastructure audit and two 2026-07-19 reference documents (a Product Status Report `.xlsx` and a Navigation Map `.html`) exist only as founder-held files outside both repos — not in git.

## 7. Session state — uncommitted local changes (resolved)

Resolved 2026-07-22 (the `package-lock.json` drift and `api.ts`'s `10.0.2.2` override). HeidiSQL vs. Claude Code for data questions: §8.

## 8. Working style / preferences

- Founder is non-technical: always explain *why*, not just *what*, when something requires a decision from them (e.g. hosting choice, auth approach, tradeoffs between doing something quickly vs. correctly).
- Flag security- and cost-relevant issues clearly and promptly (e.g. an open endpoint or an auth bypass — historically `POST /api/v1/feed` and the master OTP, both since fixed: §100, §45) — but don't block ongoing work on low-priority cleanup items (AWS leftovers, stale docs) unless asked.
- After completing meaningful milestones, remind the founder to commit to GitHub — and always confirm sensitive files (keys, credentials, `.env`, `firebase-service-account.json`) are gitignored *before* committing, not after.
- **Founder prefers checking data directly in HeidiSQL for simple lookups** — viewing a table's contents, checking whether a single row exists, eyeballing a value. Only use Claude Code for data questions that require actual code logic, multi-table joins/queries, or scripting (e.g. counting bilingual-field fill rates across several tables, cross-referencing DB rows against what the app code actually does with them). When a request comes in that's really just "what's in this table" or "does this row exist," flag that it could be checked directly in HeidiSQL instead of running it on the founder's behalf by default.
- **Standing operational fact, recurs regularly (originally documented §20):** home WiFi periodically reassigns the laptop a new local IP, silently breaking physical-device testing until `bhav-bhakti-fe/.env`'s `EXPO_PUBLIC_DEV_API_HOST` is manually updated to match. Check via `ipconfig`'s "Wireless LAN adapter Wi-Fi" entry specifically (other entries can show misleading addresses). A full Metro restart is required after any `.env` change (`EXPO_PUBLIC_*` vars inline at bundle time). Expect to repeat this periodically for as long as the manual-IP-override approach is in use — session logs elsewhere just note the IP changed and point back here, rather than re-explaining it each time.

## 9. Localization / i18n — remaining content gaps

The translation system itself is sound: react-i18next resolves strings (§54), `useI18nStore` (Zustand, persisted to AsyncStorage) is the single source of truth for the selected language, and `getLocalizedText()` genuinely follows it (§57). Remaining gaps, last reconfirmed 2026-09-29:
- **Language picker:** English and Hindi only for MVP. Gujarati/Bengali are hidden but intact — re-enable via `SELECTABLE_LANGUAGES` in `i18nStore.ts`. Their translation coverage is only ~25% (`gu.json`/`bn.json` are missing whole sections that `en.json`/`hi.json` have) — moot while hidden.
- **Deities:** all 20 rows bilingual (2026-07-19). The old Categories fill-rate figures are moot — the `categories` table was dropped (§104).
- **Per-user language preference: backend-ready, never wired up.** `UserProfile.language` exists and `GET`/`PUT /profile` read and write it, but the app never sends it — Edit Profile (§63) covers name, gender and date of birth only. Language stays phone-local and resets on reinstall or a new device.

## 10. Navigation map — screen reachability (audit 2026-07-19, recounted 2026-10-05)

**19 screen files** (`app/index.tsx`, 2 in `app/(auth)/`, 16 in `app/(main)/`; `_layout.tsx` files not counted). **5 bottom tabs** (`app/(main)/_layout.tsx`): Home (`index.tsx`), Mantra (`mantras.tsx`), Audio (`ringtones.tsx`, relabeled from "Ringtone" in §21), Wallpapers (`daily-status.tsx`, relabeled from "Status" in §23), Rashifal (`horoscope.tsx`). Navigation is all `router.push`/`router.replace` (no `<Link>` components), plus the push-notification deep-link allowlist (§95). A full navigation graph exists in a founder-held Navigation Map `.html` outside the repos, dated 2026-07-19 — likely out of date.

**3 screens are unreachable** — registered in `_layout.tsx` with `href: null`, but nothing navigates to them (rechecked by grep 2026-09-29):
- `wallpapers.tsx` — mock data (§4).
- `spiritual.tsx` — fully built on mock data (`src/data/mockSpiritual.ts`).
- `zodiac-selection.tsx` — superseded: the Rashifal grid goes straight to `horoscope-detail.tsx`.

Link-up vs. delete is undecided for all three — confirm with the founder. (Since the audit: `wallpaper-detail.tsx` deleted in §53, `mantra-quiz.tsx` in §101; `edit-profile`, `legal-document` and `delete-account` added, reachable from Profile. `choose-start.tsx` is live and counted above: registered with `href: null`, opened from Home's header link, `index.tsx:312`.)

## 11. 2026-07-20 session — Ringtones playback/caching, play count tracking, Trending Now planning

Superseded (coordinator §17, caching §24/§25, Trending §22). Still worth applying: the "Audio Content Pre-Work Scoping Checklist" (playback exclusivity, caching, platform and product questions) before building any new audio content type. Detail archived.

## 12. 2026-07-21 session — Network fix, visual/design audit, Aarti/Bhajan foundation, Audio hub decided

Resolved or superseded elsewhere (Audio hub §21, Wallpaper Hub §23, date arrows §42, emoji icons §62). Still baseline: the `'aarti'`/`'bhajan'` type ENUMs and `is_repeatable`. The missing shared `FEED_TYPES` constant flagged here now exists on `develop` (`src/constant/index.js`, with `HOME_FEED_TYPES`, §120) but not yet on `main`. Detail archived.

## 13. 2026-07-21 session (continued) — Audio player redesign, seek bar diagnosed, category duplicate confirmed, Home tap/startup jitter root-caused

Superseded (player §57/§58; category duplicate moot, §56; tap and startup jitter fixed, §25/§47). **Still open:** the seek bar has no drag gesture (tap-only `onPress`, no `Gesture.Pan()`); smoothness improved in §26, but real drag-seeking was never built. Detail archived.

## 14. 2026-07-22 session — react-native-track-player evaluated and removed

**Decision: use `expo-audio`, not `react-native-track-player`, for persistent/background audio.** `react-native-track-player` (free v4.1.2) was installed, natively configured, tested, then fully removed after hitting a genuine compile-time incompatibility with this project's toolchain (Expo SDK 54 + New Architecture) — confirmed via an actual Gradle build failure (Kotlin nullability mismatch), not just a warning. The only version that compiles against current toolchains, v5/`@rntp/player`, is commercially licensed (€99/mo+) — not viable on current budget. Removal was verified fully clean (native config reverted, rebuild succeeded, `git status` clean). Re-attempt only if budget changes or a free-tier fix ships. **Trade-off to remember for Stories:** `expo-audio` has no built-in queue/playlist concept — multi-episode "queue + autoplay-next" will need to be hand-built on top of it.

## 15. 2026-07-23 session — Animation fix, autoPlay-on-tap fix, Ringtones migrated to expo-audio, USB dev-build crash fix

Superseded (§17, §25). Still relevant: after any USB reconnect, run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` (check with `adb reverse --list`). Detail archived.

## 16. 2026-07-23 session (continued) — FeedMedia cleanup, content-rendering map, audio-player migrated to expo-audio, coordinator confirmed as next milestone

Historical. **Lesson:** use `expo-audio`'s setter methods (e.g. `setPlaybackRate()`), never direct property assignment — it silently no-ops at runtime despite the TS types. Detail archived.

## 17. 2026-07-23 session (continued) — global playback coordinator built and shipped

Done (`3de37e5`), tested on-device. `src/store/playbackStore.ts` (Zustand, deliberately not persisted — it holds live closures bound to a mounted player) has two slots: `ephemeral` (ringtones) and `persistent` (mantra, aarti/bhajan, stories). A same-mode hand-off stops the outgoing item; a ringtone preempting persistent content **pauses** it (resumable in the mini-player); persistent content preempting a ringtone stops it. `MiniPlayer` (`src/components/molecules/MiniPlayer/`, a sibling of `<Tabs>`) reads only the `persistent` slot and hides on `/audio-player`; ✕ stops. `RingtoneFeedCard` self-registers with the store, which gives cross-screen exclusivity. The player persists across navigation because inactive tab screens aren't unmounted. **Known minor risk, not hit:** a `RingtoneFeedCard` unmounting while registered could leave a stale `activeControls` reference (a defensive try/catch was recommended). Detail archived.

## 18. 2026-07-23 session (continued) — lock-screen/notification controls built, a crash fixed, zero error boundaries found

Lock-screen/notification controls — baseline. Error boundaries since added (§94). Standing scope decisions: `interruptionMode` stays `duckOthers`; no deep link to a specific screen from the notification; iOS out of scope (no `ios/` project). Detail archived.

## 19. 2026-07-23 session (continued) — lock-screen confirmed on a real phone, WiFi issue narrowed, emulator regression root-caused (fixed next session, see §20)

Resolved in §20. Detail archived.

## 20. 2026-07-24 session — isDevice fix confirmed, recurring WiFi IP-reassignment documented, an unidentified network error logged

`isDevice` fix confirmed; the WiFi IP note now lives in §8. Detail archived.

## 21. 2026-07-24 session (continued) — Audio hub restructure shipped, a real crash found and fixed

Audio hub sub-tabs (visuals since §60). **Lesson:** any cleanup that touches an `expo-audio` player needs a defensive try/catch — there is no synchronous "is released" check, and this crash recurred (§24, §25). Detail archived.

## 22. 2026-07-24 session (continued) — shared deity/trending filter shipped for Ringtones, three trending bugs found and fixed

Origin of the shared `DeityFilterRow` pattern (hub-level filter state, "Others" as a real Deity row) — the standard for any filterable content type (§23, §27, §56). Three `GET /feed/trending` bugs fixed (baseline; see §41). Detail archived.

## 23. 2026-07-24 session (continued) — Wallpaper Hub built end-to-end, mirroring the Audio hub pattern

Wallpaper Hub (Status/Thought/Wallpapers) — since extended in §33 and restyled in §61. **Not actioned:** `WallpaperFeedCard`'s `variant` prop (`default`/`grid-tile`) is temporary scaffolding; the founder wants one card style eventually — check before assuming. Share deep-linking to WhatsApp Status/Instagram Story is parked. Detail archived.

## 24. 2026-07-27 session — Cache-Control metadata pass for CSV-imported media, persistent player local caching ported from Ringtones, CDN deferred

Cache-Control metadata on CSV-imported media (still in place). A real CDN in front of Storage was deferred — revisit when volume and billing justify it. Detail archived.

## 25. 2026-07-27 session (continued) — First real bulk CSV import validated, a significant cross-content playback bug fixed, caching sequencing fixed, a native connection-pool bug found (fixed next day, §26)

First bulk CSV import validated; a bug where every mantra/aarti/bhajan card played the same audio was fixed; the connection-pool bug found here was fixed in §26. Detail archived.

## 26. 2026-07-28 session — Connection-pool fix built and confirmed, real root cause of icon/seek-bar lag found (a dead decorative animation, not expo-audio), .env IP update

**Load-bearing:** `expo-audio`'s native `AudioModule.kt` is patched (`maxRequestsPerHost` 5→20) via `patch-package` (`patches/expo-audio+1.1.1.patch`), reapplied by `postinstall` on every `npm install` and compiled from source (§36). The icon/seek-bar lag was a decorative fake wave visualizer, removed. **Lesson:** related-looking symptoms can have unrelated causes — investigate fresh. Detail archived.

## 27. 2026-07-28 session (continued) — Aarti/Bhajan Audio hub tabs built and shipped, generalized back-navigation fix, Search Results isRepeatable bug fixed

Aarti/Bhajan Audio hub tabs (visuals since §60). The `returnTo`/`returnParams` back-navigation convention that every entry point passes started here (§56, §59, §62). Detail archived.

## 28. 2026-07-29 session — Aarti/Bhajan auto-loop fix, full 8-phase queue feature built, two lock-screen items deferred

Auto-loop fix and the Aarti/Bhajan queue (Previous/Next, shuffle-ready store, Like/Share, "Up Next" sheet) — the base of §57. Of the two deferred lock-screen items, skip was fixed in §36; the metadata mismatch is still partly open (§38). Detail archived.

## 29. 2026-07-31 session — Home feed viewport-autoplay: scoped, not built

Scoped only; built in §30. Detail archived.

## 30. 2026-08-01 session — Home feed viewport-autoplay Phases 1-4 built and shipped

Done (`fb8b518`, `39e5fc9`), frontend-only. Home only (opt-in `enableViewportAutoplay`): the card at least 60% visible autoplays, one at a time (200 ms debounce, plus a 500 ms floor between player starts because of connection-pool sensitivity). Cards measure themselves (no fixed `getItemLayout`). `AutoplayFeedCard` has its own per-card player (no `playbackStore` — overlapping the persistent player is accepted), a 30 s audio cap, looping video, a play/pause overlay, CTA pills and a Like/Share/Views footer (`formatCount`). Phase 6 (hardening) was never formally run. Detail archived.

## 31. 2026-08-01 session (continued) — Phase 5 confirmed already built, app-backgrounding autoplay bug fixed

Muted-by-default video with a persisted unmute (`soundPreferenceStore`); backgrounding now stops Home autoplay through an `AppState` listener folded into `isEffectivelyActive` (`a21460b`). Detail archived.

## 32. 2026-08-02 session — Status sub-tab Reels-style feed: first attempt reverted, rebuild scoped

Abandoned (§33): a FlatList snap-scroll can't guarantee zero adjacent-item bleed. Nothing committed. Detail archived.

## 33. 2026-08-03 session — Wallpaper Hub video support + Viewing Window feature shipped; pager-view rebuild abandoned

Done (`c691eda`, `65be4d7`), frontend-only. Grid tiles loop muted video (independent of `soundPreferenceStore`); tapping opens the **Viewing Window** (a centered 80%×80% `Modal`, with sound, Like/Share/Download via `useWallpaperActions`, gated by `PREMIUM_GATING_ENABLED`, §106). Fixed: a stale Like state, video not pausing in the background (explicit `pauseAsync()`), and download name collisions plus a hardcoded `.jpg` that corrupted videos (shared `getMediaFileExtension`). The pager-view Reels feed was abandoned, not deferred. Detail archived.

## 34. 2026-08-04 session — Real content sharing built (react-native-share)

`react-native-share` replaced RN's text-only `Share` (it sends a real file plus caption on Android). The shared `shareContent(feed)` handles MIME types, thumbnail-only sharing for audio, a double-tap guard and share counts. Captions since §116; share gating since §106 (off). Detail archived.

## 35. 2026-08-04 session (continued) — Lock-screen skip-button root cause found, fix unverified this session

Superseded by §36. Detail archived.

## 36. 2026-08-05 session — Skip-button fix DONE, confirmed on a real device; buildFromSource root cause confirmed via dex decompilation

Done, confirmed on device and by decompiling the installed APK. `expo-audio` linked a prebuilt AAR, ignoring every native patch, until `expo.autolinking.android.buildFromSource: ["expo-audio"]` — **keep it, or every native patch (incl. §26) silently stops applying**. The lock-screen seek commands now trigger skip next/previous (seek-by-10 s removed, founder's choice). Detail archived.

## 37. 2026-08-05 session (continued) — Lock-screen/notification skip-vanish bug: two real root causes fixed and confirmed on-device; a new, separate metadata-race finding logged, not yet investigated

Two fixes, tested on-device: a stable `instanceId` (`useId()`) lets the coordinator tell new content on the same player from a different player; skips use the in-place `updateLockScreenMetadata` instead of a full session rebuild. A paused lock-screen entry auto-dismisses after 30 minutes. The metadata race found here is §38. Detail archived.

## 38. 2026-08-06 session — Lock-screen metadata fix: PARTIAL, title confirmed working, artwork gap documented, not fixed

**Metadata mismatch fix (§37's finding) — PARTIAL, committed as-is, not silently presented as done.** Two-part fix built: explicit `MediaItem` metadata (title/artist/artwork) declared at load time from the already-available `contentData`, plus disabling ExoPlayer's `TRACK_TYPE_METADATA` track selection so nothing should compete with it. **Title fix confirmed working via real on-device testing** — though not yet proven against a file with genuinely competing embedded title data; the current test files may simply lack one, so this isn't fully conclusive yet. **Artwork fix confirmed present and compiled but NOT effective.** Root cause: `TRACK_TYPE_METADATA` disables the wrong mechanism — embedded cover art (ID3 `APIC` frames) on local/progressive audio files rides directly on the audio track's own `Format.metadata`, not a separate disableable metadata track, so the disable call never touches it. Committed as-is with this documented honestly rather than presented as fixed — the title win is real progress, the artwork gap is inert (no crash/regression), just not yet closed.

**NEXT REAL TEST, not yet run:** once a genuine thumbnail is uploaded to any track, check whether the app's data or the file's embedded picture wins — that's the honest signal needed before any further work here. If title also gets overridden once tested against a file with real embedded title data, the same root issue applies there too, meaning the title "fix" was untested luck, not a genuine confirmation.

## 39. 2026-08-11 session — App branding: icon, splash screen, display name, package identifier

Done. Display name "Bhav Bhakti"; package `com.orivori.bhavbhakti`. **Gotcha:** adaptive-icon artwork needs margin inside the 1024×1024 canvas or Android's shape mask crops it (the safe zone is reused in §44). Detail archived.

## 40. 2026-08-12 session — Rashifal MVP core built: real AI content, birthdate-collection flow, three real bugs found and fixed

Done, tested on-device. Gemini-generated Rashifal replaced the dead third-party chain (missing content now fails visibly). Home's horoscope card asks for a birthdate once, then routes straight to the sign. Fixed: a profile call to a non-existent URL; 8 horoscope routes with `validate` passed uninvoked (they hung forever); a UTC/IST date bug — **use the shared local-date utility (`getLocalDateString`), never `new Date().toISOString().split('T')[0]`.** Detail archived.

## 41. 2026-08-12 session (continued) — Trending 7-day window removed, previously undocumented

Done (`a4d16e5`): `getTrendingFeeds` no longer drops content older than 7 days for any type.

## 42. 2026-08-12 session (continued) — Rashifal Phase 4 shipped, premium status stub consolidated

Done (`d791560`, `6b4681d`). Rashifal is today-only (date pill removed); the grid paywall was later removed (§69). Three `isPremiumUser` stubs were consolidated onto `usePremiumStore` — real per-user premium status is still unbuilt (§87). Detail archived.

## 43. 2026-08-12 session (continued), resolved 2026-08-13 — Firebase Phone Auth Phases 1-4

Phases 1–4 done: the backend verifies the Firebase ID token, then issues its own session. Sideload-era quirks (the Android API key's app restriction relaxed to "None" for the reCAPTCHA fallback; no Play Integrity) ended with Play Store distribution (§81). `google-services.json` is untracked and deliberately left in git history (the same key ships in every APK). Detail archived.

## 45. 2026-08-13 session — Firebase Phone Auth Phase 5 shipped: fake OTPless bypass fully removed, all 5 phases complete

Done. The OTPless bypass (master OTP `123456`, `TEST_NUMBERS`, `SEND_OTP_ENABLED`) and its routes and service were deleted; existing users kept their accounts. SMS auto-fill not pursued (`READ_SMS` is a Play rejection risk). Detail archived.

## 44. 2026-08-12 session (continued) — Dependency drift cleanup, app icon resized

Done. `npx expo install --fix` brought 6 packages to Expo's recommended versions (the §26 patch reapplied); the icon was resized within §39's safe zone.

## 46. 2026-08-13 session (continued) — UI design-system foundation shipped

Done. Background colour centralised in `goldenTempleTheme.ts`; Noto Sans Devanagari loaded and weight-aware; every `Text` goes through the shared atom. Detail archived.

## 47. 2026-08-13 session (continued) — Phone-login → verify-otp navigation flicker resolved, both auth screens redesigned

Done. The login → OTP flicker was fixed (a duplicate toast, the auth stack's background colour, keyboard-dismiss timing); both auth screens redesigned. Detail archived.

## 48. 2026-08-14 session — Nav bar + Home quick-links icons: dead CloudFront links replaced with local SVGs

Done. Dead CloudFront `SvgUri` icons replaced with local SVGs (`react-native-svg-transformer`); tab focus colour `#FF6B00`; a shared `QuickLinkCard` + `categories.ts`. Detail archived.

## 49. 2026-08-14 session (continued) — AutoplayFeedCard restructuring + Home decluttering shipped; peek-spacing regression fixed same session

Done. The card type label sits in a header row with "See all"; `HEADER_ROW_HEIGHT` is subtracted from `contentAreaHeight` to keep the next-card peek. Detail archived.

## 50. 2026-08-14 session (continued) — Feed import duplicate-insert bug found and fixed

Done. The importer inserted duplicates on every run; it now does find-or-update on a unique `csv_id`. Detail archived.

## 51. 2026-08-14 session (continued) — AutoplayFeedCard audio redesign shipped

Done. Audio card layout (since redone, §112); `AUDIO_CONTENT_HEIGHT_RATIO` 0.75 is the safe floor. Play after the 30 s cap uses `getPlaybackCapSeconds()` + `seekTo(0)`. Detail archived.

## 52. 2026-08-15 session — Tap-active-tab-to-scroll-to-top shipped across all 5 bottom tabs

Frontend-only, done on all 5 tabs: tapping the active tab scrolls to the top (`useScrollToTopOnTabPress`, `tabPress` + `isFocused()`); list components expose their `FlatList` via `forwardRef`. Visual only — refresh-on-tap is a separate, deferred feature. Detail archived.

## 53. 2026-08-16 session — TypeScript cleanup pass

Done. Fixed `search-results.tsx`'s wrong `SafeAreaView` import; removed the clipboard OTP leftover; deleted dead screens; fixed `horoscopeService.ts`'s unused methods that double-unwrapped responses. Detail archived.

## 54. 2026-08-17 session — Language/i18n system migrated to react-i18next: ALL 5 PHASES DONE, COMMITTED, TESTED

Done. react-i18next replaced six hand-rolled mechanisms, with two namespaces, `translation` and `player` (both once had a top-level `mantras` key). `useI18nStore` stays the source of truth, synced via `i18n.changeLanguage()`. Gujarati/Bengali hidden (§9). Detail archived.

## 55. 2026-08-19 session — Horoscope English/Hindi content mismatch found and fixed

Done. English is generated once, then that exact content is translated into Hindi (`luckyNumber` copied; retry-safe by reading the English row back from the database). Old mismatched rows left as-is. Detail archived.

## 56. 2026-08-19 session (continued) — Mantra Explorer redesign: ALL 4 PHASES BUILT, COMMITTED, TESTED ON-DEVICE

Done, on device. Mantra Explorer: `DeityFilterRow` + `useMantraFeed` replaced the broken `categoryId` grid; "Trending" renamed "All" app-wide; mood tiles play a random match (`sortBy: random`, filtered by `tags=`, §103). Mantra list ordering (`Feed.order` is never populated) was scoped out as a separate task. Detail archived.

## 57. 2026-08-20 session — Aarti/Bhajan Player Redesign: ALL 6 PHASES DONE, COMMITTED, TESTED ON-DEVICE

Done, on device. YT-Music-style Aarti/Bhajan player with the bottom nav hidden. Fixed: the importer overwrote the artist with the English title; `getLocalizedText()` was hardcoded to English. Detail archived.

## 58. 2026-08-20 session (continued) — Mantra Player Redesign: DONE, COMMITTED, TESTED ON-DEVICE

Done, on device. Mantra controls: Speed / Play-Pause / Chant counter. `CounterSheet.tsx` rebuilt (an SVG arc — the old indicator maxed at 50%); `MoreTargetsSheet.tsx` is portaled, fixing a layering bug. Detail archived.

## 59. 2026-08-20 session (continued) — Search: FOUND BROKEN, FULLY FIXED, COMMITTED, TESTED

Done. Search matches the bilingual title, deity name and content-type label (word-split OR, ranked by match count; no SOUNDEX). A shared `MantraFeedCard` on Home/Search/Mantra Explorer; `WallpaperFeedCard`'s default variant plays video; Search passes `returnParams`. Detail archived.

## 60. 2026-08-21 session — Audio hub UI overhaul shipped

Done, still the current look: search bars on Mantra Explorer and the Audio hub, consistent card styles, and the Set-as-Ringtone "Sound Settings" button fixed. Detail archived.

## 61. 2026-08-23 session — Wallpaper hub UI overhaul, MiniPlayer/audio-player small fixes

Done. Wallpaper hub restyle (`wallpaperHub` namespace); thought content now uses `WallpaperFeedCard`; a buggy pulsating play animation removed; MiniPlayer restyled; a tab-bar height mismatch fixed across 15 files. Detail archived.

## 62. 2026-08-23 session (continued) — Rashifal UI overhaul

Done. Rashifal restyle; the back button respects the entry point (`returnTo`). Detail archived.

## 63. 2026-08-24 session — Profile section rebuild

Done. A real Edit Profile screen (name, gender, DOB) and Profile screen; non-working stubs removed; Manage Subscription/Terms/Refund Policy stubs added. The notification-settings deep link was never confirmed. Detail archived.

## 64. 2026-08-25 session — App hosting

Done. Backend and MySQL on Railway; Firebase credentials via a base64 env var; EAS Build connected. Detail archived.

## 65. 2026-08-26 session — EAS Update pipeline + real bug fixes

Done. Fixed Devanagari corruption from the first database migration — **use `--result-file`/`SOURCE` for dumps, never a PowerShell pipe**. The `Text` atom no longer forces `fontFamily: 'System'`; the Liked filter was wired up; EAS Update set up. Detail archived.

## 66. 2026-08-26 session (continued) — EAS Update proven, permission audit, Liked-filter crash fixed, horoscope cron automated

Done. After an OTA, close and reopen the app twice. MediaLibrary permission handling audited. Horoscope generation automated as a Railway cron — **the cron service needs `TZ=Asia/Kolkata`**, or every reading is labelled a day off.

## 67. 2026-08-27 session — Three small fixes: language toggle, mantra counter rework, back navigation

Done. The language toggle shows the current language; the chant counter resets only on a real feedId change; hardware back respects `returnTo` via `BackHandler`.

## 68. 2026-08-27 session (continued) — route-param URL corruption bug fixed

Done (`fd4c43b`). `useLocalSearchParams()` decodes params, which corrupted Firebase URLs' percent-encoding — every entry into `audio-player.tsx` passes `encodeURIComponent()`. Detail archived.

## 69. 2026-08-30 session — Audio-player investigation, second half

Done: Home created 5 ExoPlayers on every launch (fixed); a stuck retry; the cache directory + a 14-day sweep; Rashifal made free for everyone; Hindi translations. **Still unresolved:** the overnight ExoPlayer stall (needs a native `onPlayerError` listener). Payment scoping started here. Detail archived.

## 70. 2026-08-31 session — Premium pipeline scoped, Firebase Auth SHA-fingerprint bug fixed, eas.json production profile fixed

Premium pipeline scoped (built §77–§79). Fixed: the release-keystore SHA fingerprints are now the ones registered in Firebase; `eas.json`'s production profile has its update channel. Detail archived.

## 71. 2026-09-01 session — Recurring Hindi text truncation bug fixed (Up Next, Logout, See-all, header title)

Fixed a real, recurring Hindi text truncation bug affecting 5 locations (Up Next handle, Logout button, both See-all links, Home header title) — root cause was React Native's own text self-measurement failing on Android with the Devanagari font, NOT a space/width constraint (confirmed via real adb uiautomator captures). Proven fix: explicit minWidth/lineHeight/minHeight floors instead of relying on auto-measurement — reusable pattern for any future occurrence of this exact class of bug.

## 72. 2026-09-01 session (continued) — Mantra chant counter attention bubble

Added the mantra chant counter attention bubble (shown to all users, 3x/day cap, 7s auto-dismiss, tap-anywhere-to-dismiss, right-aligned positioning) — feature-discovery nudge ahead of the future chant-counter paywall. DONE, COMMITTED, TESTED.

## 73. 2026-09-04 session — Play Console setup: account cleanup, versionCode bumped

Play Console ownership cleaned up. (`versionCode` is now 8, §122.) Detail archived.

## 74. 2026-09-05 session — Real dev/production package identity split, production-push safety script, Play Console upload key reset

Done. Two separate apps, `com.orivori.bhavbhakti` and `.dev` (each with its own Firebase registration and keystore); production OTAs only via `npm run update:production` (typed confirmation, staged rollout). Since `402ce89` the `.dev` app's `development` variant uses `api-dev.orivori.com`; the `preview` variant can still point at production (§96). The upload key reset is §80. Detail archived.

## 75. 2026-09-05 session (continued) — Test-account data isolation

Done. `users.is_test_account` plus a unique `(firebase_uid, is_test_account)` index make `.dev` and production logins separate users. Shared `Feed` counters are an accepted cosmetic trade-off. Detail archived.

## 76. 2026-09-05 session (continued) — Railway database migration reconciliation, eas update environment-variable gap closed

Done. Railway's `SequelizeMeta` was backfilled (the database came from a dump). `eas update` ignores `eas.json`'s env blocks, so the safety script pins `--environment production`. Detail archived.

## 77. 2026-09-06 session — Premium Subscription Pipeline Chunk 1: credential-free slice built and shipped

Done. Tables `subscriptions`/`subscription_events`/`payments`; the `isPremiumNow` util (unit-tested); the Razorpay SDK. Detail archived.

## 78. 2026-09-06 session (continued) — Chunk 2: the full Razorpay webhook handler, built and tested against self-crafted fixtures

Done. `POST /api/v1/webhooks/razorpay`: HMAC-SHA256 check (`req.rawBody` via `express.json()`'s `verify`), idempotency on `X-Razorpay-Event-Id`, and one transaction for event logging + state sync (`syncFromRazorpayEntity`). Replay caveat: §100. Detail archived.

## 79. 2026-09-06 session (continued) — Chunk 3: service layer, endpoints, reconciliation job — DONE, verified against Razorpay's real test-mode API

Done, verified against Razorpay test mode: `razorpay.service.js`, `/subscription` create/status/cancel, and `scripts/reconcile-subscriptions.js`. An unset `RAZORPAY_PLAN_ID` no longer crashes startup. Detail archived.

## 80. 2026-09-07 session — Play Console upload key now live in EAS production credentials

Done. `new-upload-key.jks` is EAS's `production` signing credential, matching Play Console. Detail archived.

## 81. 2026-09-08 session — Real, first-of-its-kind Play Store phone-auth bug: DIAGNOSED, FIXED, AND CONFIRMED WORKING

Done (`fe: 60bac85`, v3). Real-number login failed with `auth/session-expired` because Play's SMS auto-verification beat `confirm(otp)`; fixed by also watching `onIdTokenChanged`. **Lesson:** test numbers bypass this native path and can't validate real-number auth. Detail archived.

## 82. 2026-09-09 session — Legal documents + account deletion: SCOPED (superseded by §84)

Scoped here; built in §84. Detail archived.

## 83. 2026-09-09 session (continued) — Session/auth improvements: SCOPED here, resolved elsewhere

Four items found: (1) the frontend/backend expiry mismatch and (2) dead 401 code — shipped (§87). (3) Expiry is now re-checked on resume (§106/§107); **still unbuilt:** resetting navigation to Home after a long background. (4) `isNewUser` is now used for analytics (§95, §109), but **the "Welcome Back" text on `phone-login.tsx` is still hardcoded for everyone.** Detail archived.

## 84. 2026-09-09 session (continued) — Legal documents + account deletion: BUILT AND CONFIRMED WORKING

Done, shipped in v4 (§86). `LegalDocumentViewer` (WebView; full-screen and bottom-sheet modes) for Terms/Privacy/Refund Policy in Profile and the login screen; a Support ID derived from `firebaseUid` (backend `8c8a7c0`); the account-deletion flow (`5b504d3`). Six bugs fixed along the way. Detail archived.

## 85. 2026-09-10 session — NEW, PERMANENT BRANCHING WORKFLOW ADOPTED: dev / production / master

**NEW WORKFLOW, adopted 2026-09-10, following a real production incident on 2026-09-09 that exposed a critical gap: `eas update` ships whatever is physically present in the local working directory at the moment it runs, completely independent of git commit status — meaning uncommitted or unintended code can reach production silently.** That gap is exactly how untested session/auth work reached production that night (see the incident's own live investigation earlier this session — the crash-causing update was bundled from an uncommitted working tree that also, unintentionally, included the already-committed-but-`.dev`-only-tested legal documents feature).

We now use three branches with distinct, permanent roles:

- **`dev`** — our everyday, active working branch. All regular commits, features, and fixes happen here first, tested against our `.dev` app via `eas update --branch preview`.
- **`production`** — a curated branch that ONLY receives specific commits via `git cherry-pick` from `dev`, once something is deliberately confirmed tested and ready to go live. We push to real production ONLY from this branch (`npm run update:production`), never from `dev` directly.
- **`master`** — our trusted, stable baseline. Only updated by merging FROM `production` once something is confirmed working in real, live production. GitHub's default branch stays `master`, deliberately — matching this model, where `master` represents the trusted, stable state, exactly what an outside visitor or fresh clone should see first.

`scripts/confirm-production-update.js` now enforces this at the tooling level — it checks the current branch is genuinely `production` and the working tree is clean before allowing any production push to proceed, refusing with a clear error otherwise.

All three branches were established from a single, correct shared baseline (commit `d0c3d25`, `bhav-bhakti-fe`) on 2026-09-10.

## 86. 2026-09-10 session (continued) — versionCode 4 submitted to Play Console Closed Testing

v4 submitted to Closed Testing (now v8, §122). Detail archived.

## 87. 2026-09-13 session — Session-expiry sync + contextual login prompt: DONE, live in production and merged to master (since generalized, §106/§107)

**Part 1:** the app reads the JWT's own `exp` claim (a small hand-written base64url decoder) instead of a hardcoded 24h, so its local check matches the backend's real 10-day expiry. `jwt.util.js` now preserves the real error type — expired or invalid token → 401, an unrelated server/database error → 500, never misreported as session expiry. **Part 2:** a "session expired, please log in again" prompt (one Zustand store, one modal at the app root, same pattern as the paywall) that returns the user to the screen they were on. It originally fired only for six opted-in action endpoints; since §106/§107 every 401 is handled once, centrally. The original product rule here — browsing needs no login, only actions do — was **superseded by §107**: every feed-serving endpoint now requires login (Group 4 step 5).

**Still open — HIGH PRIORITY for the next Premium session:** `isPremium` is permanently `false` for every user. `setSubscription()` is never called anywhere; the Premium frontend (wiring up `GET /subscription/status`, purchase UI) was never built, so a paying subscriber is indistinguishable from anyone else. `usePremiumStore`'s stub is now seeded from the `enablePremiumSubscriptionUI` feature flag.

## 88. 2026-09-11 session — Rashifal back-navigation fix: DONE, CONFIRMED WORKING, live in production and merged to master

Done, live. Hardware back on `horoscope-detail.tsx` respects the entry point (`BackHandler` + `useFocusEffect`). Detail archived.

## 89. 2026-09-11 session (continued) — Auto-verification visible feedback: DONE, CONFIRMED WORKING, live in production and merged to master

Done, live. A "✓ Verified automatically" banner and input lock on SMS auto-verification (an `isVerifyingRef` guard stops false positives). Checking typed digits against the auto-retrieved code was deliberately not built. Detail archived.

## 90. 2026-09-11 session (continued), updated 2026-09-14 — Rashifal variety: second fix applied

The first fix (real date interpolation) helped day-to-day repetition, but different signs then converged on identical lucky values on the same night. Root cause: no `temperature` set on the Gemini call, and no sign-specific signal for those fields. Fixed: `temperature: 1.4` (English generation only, not the Hindi translation); anchoring example values and two instructions a stateless call can't honor were removed. `Bhav_Bhakti_Handoff.md` treats this as fixed; since temperature is probabilistic, within-sign and cross-sign variety are still worth watching.

## 91. 2026-09-11 session (continued) — NEXT SESSION reminder: pick up the deferred §87 session/auth work — RESOLVED, see updated §87

Resolved — see §87 (and §107, which later required login on every feed endpoint). Detail archived.

## 92. 2026-09-12 session — Jio network blocking Railway backend: DIAGNOSED AND FIXED

Done, live. Jio blocked `*.up.railway.app`; production uses `api.orivori.com` with an automatic Railway fallback. **Lesson:** production backends need a custom domain. Detail archived.

## 93. 2026-09-13 session (continued) — Observability gaps: SCOPED here, all three tasks shipped in §94

Scoped here; all three tasks built in §94. SLO dashboards/Grafana/APM declined as premature. Detail archived.

## 94. 2026-09-15 session — Observability trio: DONE, CONFIRMED WORKING

Done, shipped in v5. Crashlytics with the Support ID (`setUserIdentifier()`), a backend uncaught-exception/unhandled-rejection handler and a root error boundary — a triggered test crash was confirmed in the Console. Since §125 Crashlytics also gets the custom keys `ota_update` (the Profile > About short tag) and `ota_update_id`, set at app start in `app/_layout.tsx`. Plans written here (`Bhav_Bhakti_Push_Notifications_Plan.md`, `Bhav_Bhakti_Analytics_Event_Plan.md`) shipped in §95. Detail archived.

## 95. 2026-09-18 session — Push notifications shipped to production; Analytics 4-of-5 buckets shipped to production

**Push notifications — live, merged to master.** Permission asked right after login; one all-users topic; the notification icon comes from a hand-written config plugin, not `expo-notifications` (a `firebase.json` fix avoids a manifest-merger clash with `react-native-firebase/messaging`); deep links go through a validated route allowlist (an invalid route falls back to Home). Foreground display deferred (needs Notifee or similar). No custom backend — sending is done from Firebase Console.

**Firebase Analytics — partly done.** Built and checked in DebugView across the funnel buckets (Acquisition deliberately left to Play Console). Still open: refining `login_failed`'s raw error codes and `card_rank` position tracking; the Premium conversion events (`trial_started`, `trial_converted_to_paid`, `subscription_cancelled`) wait for the Premium frontend — only `paywall_hit` and `upgrade_cta_clicked` are live. Detail archived.

## 96. 2026-09-24 session — Railway dev environment provisioned; first security-audit fixes shipped to production

A Railway **development environment** now exists for the backend — its own MySQL database, deployed from a new `bhav-bhakti-be` `develop` branch. The frontend `.dev` app's `development` variant has used it since `402ce89` (frontend `dev`, 2026-09-24) via `api-dev.orivori.com`; the `preview` variant can still point at production. **First security-audit fixes — DONE, live in production on both repos:** TLS on the database connection, HSTS, a centralized `ResponseHandler.errorSafe()` that stops raw exception details reaching the client (swept across all controllers), and no more JWT/PII in frontend logs (`authStore.ts`, `useAuth.tsx`, `apiClient.ts`, `secureStorage.ts` — confirmed via an on-device logcat capture). Detail in `Bhav_Bhakti_Security_Audit_Plan.md`.

## 97. 2026-09-24 session (continued) — Security audit Group 2 (Access Control): DONE, live in production

Backend `develop` merged into `main` (`7698adb`); a 31-check smoke test against production passed, nothing written. Backend-only. Shipped: `requireAdmin` on `/categories/admin` (since removed with `categories`, §104), all 5 upload routes and `DELETE /upload/media/:key`; `authenticate` on `/analytics/global-stats`; Facebook OAuth removed (the `users.facebook_id` column kept); the forgeable `admin.auth.middleware.js` deleted; `POST /profile/photo` removed, closing a real hole — any logged-in user could point `profilePicture` at a content file, then `DELETE /profile/photo` deleted it from storage (it now only clears the database reference).

**New safety mechanism:** `scripts/confirm-db-target.js` — before `import:feeds`, `create-categories-from-csv.js` or `create-deities-from-csv.js` touches a database, it shows the target labeled PRODUCTION/DEVELOPMENT/LOCAL/UNKNOWN from the real `DB_HOST` (never `NODE_ENV`) and requires typing that label; it refuses to run non-interactively. Update its host-to-label map if Railway ever regenerates a proxy hostname.

**Significant finding, fixed:** production's `JWT_SECRET` was still the `.env.example` placeholder (anyone guessing it could forge a login for any user) — rotated in both Railway environments. **Still open:** `role = 'admin'` not set on the founder's production account (deliberately deferred — the CSV importer bypasses the API); dev database password rotation declined by the founder.

## 98. 2026-09-24 session (continued) — Security audit Group 3 (Rate Limiting): DONE, live in production

Backend `develop` merged into `main` (`8fee297`). Every limit was triggered for real on dev; production got a light smoke test only. Five limits (`express-rate-limit`, all in `src/middlewares/rateLimit.middleware.js`, one named constant per value): login (`POST /auth/firebase/verify`) 20/min **and** 75/hour per IP; `POST /subscription/create` 5/hour per user (after `authenticate`); Razorpay webhook 100/min per IP (flood backstop); one shared 300/min per-IP budget for the content API (feed, horoscope, deities, feature-flags — mounted in `src/routes/index.js`, before any route-level auth); the existing `/profile/*` limiters unchanged (20 writes/15 min, 30 reads/min). Every 429 is the standard `{ success: false, message }` and logs a `[rate-limit]` line — search Railway logs for it if a user reports being blocked. Login and content limits are deliberately looser than the audit's first draft (a founder decision): Jio/Airtel CGNAT puts many real users behind one public IP.

**`trust proxy` is `2`** (`src/app.js`): Railway has two relays in front of the app; wrong values either split one user across edge IPs or lumped many users together (this also fixed the `/profile` limiter lumping users onto a shared relay address). Railway's edge discards client-supplied `X-Forwarded-For`, so the IP can't be spoofed. **If a CDN/proxy is ever put in front of `api.orivori.com`, this hop count must change.** Also: malformed JSON bodies now return 400, not 500. Known limitation: counts live in server memory — reset on every deploy, and not shared if the backend ever runs multiple instances (that would need Redis).

## 99. 2026-09-24 session (continued) — Security audit Group 5 (Automated Database Backups): DONE, live in production

Backend `develop` merged into `main` (`aae14c3`). A production-only Railway cron service (auto-deploy off, set up by the founder) runs `scripts/backup-database.js` daily at 3am IST (`30 21 * * *` UTC): `mysqldump` → gzip → Firebase Storage `backups/YYYY-MM-DD-HHmm.sql.gz` (India time) → retention cleanup. Each run logs one `[db-backup] SUCCESS …` or `[db-backup] FAILED stage=… error=…` line; failures exit 1. First production run: ~509 KB, 5.9 seconds.

Separate image `Dockerfile.backup` (selected via `RAILWAY_DOCKERFILE_PATH`), built on the official `mysql:9.4` image plus Node — Alpine only offers MariaDB's `mysqldump`, which can't log in to MySQL 9.x. **If Railway's MySQL is ever upgraded, bump the `mysql:` tag to match.** It connects only via the database's private address (`${{MySQL.MYSQLHOST}}`) and refuses the public `*.proxy.rlwy.net` one.

Retention (`src/utils/backupRetention.util.js`, unit-tested): the newest backup from each of the last 7 days that have one, plus the newest from each of the 4 weeks before — at most ~11 files. Count-based, so a gap in runs never wipes old backups as "too old"; deletes only after a successful upload; never touches files that don't match the naming pattern. **Found and fixed before any real backup was uploaded:** the bucket was publicly listable/readable, so `storage.rules` now excludes `backups/` from public reads — any future rules change must keep that exclusion. Restore verified during dev testing (0 row-count differences, Hindi intact). The audit plan notes a backup-schedule doc-vs-behavior mismatch not yet reconciled.

## 100. 2026-09-24 session (continued) — Security audit Group 9 (Adversarial Testing): DONE — 4 findings, 2 fixed and live, 2 deliberately deferred

10 real attacks against the dev environment (not code review): cross-account reads/writes and privilege escalation via profile updates; expired, tampered, `alg:none` and wrong-secret JWTs; login-token reuse; non-admin access to admin, upload and delete-media routes; forged and replayed Razorpay webhooks; bad page sizes; a 600-request burst (the limiter held at exactly 300/min). All rejected except 4 findings.

**Fixed, live in production (merge `1ca0f5e`):** `POST /feed` was fully open, with no login at all — now `authenticate` + `requireAdmin` (`bfb3a51`; the CSV importer writes via Sequelize and is unaffected). `GET /categories/:id/feeds` accepted unbounded or negative page sizes (that route has since been removed with `categories`, §104).

**Deliberately NOT fixed (MVP scope, founder decision):** (1) Firebase login-token reuse — the same ID token is accepted repeatedly within its 1-hour validity, each time opening a new 10-day session; fix when picked up: reject tokens whose `auth_time` is more than a few minutes old. (2) Razorpay webhook replay with a new event ID — duplicate detection keys on the unsigned `X-Razorpay-Event-Id` header, so a captured signed body re-sent with a new ID is processed again; no money or premium-time impact (payments key on Razorpay's payment ID, handlers write absolute values), worst case a stale status is reapplied; fix: also dedupe on a hash of the raw body and/or ignore events older than the last applied. Minor: `POST /feed` hardcodes user 1 as owner. Testing notes: the dev database has no admin users (tests temporarily promoted one and reverted); dev's `RAZORPAY_WEBHOOK_SECRET` differs from the local `.env`'s.

## 101. 2026-09-25 session — Mantra quiz feature fully removed: DONE, live in production

Done, live. The quiz never produced recommendations, so it was removed end to end; its 4 tables were dropped in both databases (migration `20260925000001`, run by hand). Content backed up at `bhav-bhakti-be/archive/mantra-quiz-content-backup-2026-09-25.json`. Backend `main` merge `1cf22a4`; frontend `c9ec390`. Detail archived.

## 102. 2026-09-26 session — Feeds schema redesign Phases 1–3 built on dev (superseded by §104)

Built on dev, promoted in §104. **`D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Feeds_Schema_Redesign_Plan.md` is the source of truth for anything touching feeds, tags or the CSV importer.** Dev migrations run with the dev-scoped Railway token (`railway run --service MySQL`), never via `.env`. Detail archived.

## 103. 2026-09-26 session (continued) — Feeds schema redesign Phases 2–3 finished on dev, `label` retired (superseded by §104)

Promoted in §104. The app reads the new fields via `src/utils/feedFields.ts`; new `excludeTagGroup` filter (the Wallpapers tab uses `excludeTagGroup=occasion`); a request still sending `label` gets a **400** by design (ignoring `label=none` would widen an old build's Wallpapers tab). Still open: a downloaded wallpaper appears in the gallery but won't open (Handoff item 10, not re-tested since §115). Detail archived.

## 104. 2026-09-26 session (continued) — Feeds schema redesign: FULLY COMPLETE, live in production

**Live in production since 2026-09-26** (backend `main` merge `24091f6`; frontend `production`/`master` `0e0c9a7`). Full record: the plan doc's Part 9. `categories` retired; `label` replaced by a many-to-many `tags`/`feed_tags` system (filter with `tags=`/`excludeTagGroup=`); `feed_media` merged into `feeds` (Storage paths, bilingual `subtitle`); the `media[]`/`caption`/`label` shims retired. Five staged releases, one ~10-minute outage. Production migrations go through `bhav-bhakti-be/scripts/migrate-production.js` (production-only, typed `PRODUCTION`, mandatory `--to`); JSON backups in `bhav-bhakti-be/archive/production-*-2026-09-26.json`. The v7 follow-up shipped with §109. Detail archived.

## 105. 2026-09-26 session (continued) — Feeds schema redesign production promotion: verified complete against git

Re-verified against git on 2026-09-27; stage-by-stage commits archived.

## 106. 2026-09-27 session — Security audit Group 4: steps 1–4, 6 and 9 closed; step 5 and the step-2 refinement built (both since live, §107)

Full detail in `Bhav_Bhakti_Security_Audit_Plan.md` (Item 11 and the Group 4 build log).
- **Step 2 — premium gate on download/share/enlarged view:** backend `checkMediaAccess` + `requireMediaAccess`; one frontend `authorizeMediaAction` gate that every download/share/view path calls first. **Live in production but switched off** (backend `main` merge `c22c86d`, frontend `production` `79b4a4d`; `PREMIUM_GATING_ENABLED` unset — see §107's open item). When on, it gates wallpaper/thought download, share and view, and ringtone download. The same release retired the old `isPremium` stub on Home's action button and the enlarged view (Listen is always free), fixed double-counted downloads/shares, and started counting ringtone downloads. `profile.tsx` (and the orphan `spiritual.tsx`/`wallpapers.tsx`) still read the old stub — left for the Premium frontend work.
- **Steps 3–4 — storage paths instead of URLs:** done by the feeds redesign (§104).
- **Step 6 — closed:** the 300/min per-IP content limit stays (no API limit can stop metadata scraping — one `GET /feed?limit=100` returns the whole library). The real gap it surfaced was fixed instead: anonymous listing of Storage folders — `storage.rules` now allows `get` but denies `list` (repo `0497737`, published by the founder, verified live).
- **Step 9 — billing alert:** confirmed already set up in an earlier session (audit plan, Item 11 step 9). The inconsistency this section originally flagged is resolved.
- **Step 5 + frontend 401 handling — built and tested on dev here, promoted in §107:** backend `cea19d5` puts `authenticate` on every feed-serving endpoint (and fixes Home/Search showing user 1's likes to everyone); frontend `c2cbbda` handles any 401 once, centrally (`apiClient` → `src/shared/services/sessionExpiry.ts`): session cleared, a non-dismissible, translated Session Expired prompt shown once, same return-to-screen login, token expiry re-checked on resume, React Query no longer retries a 401, the six `promptOnAuthFailure` opt-ins removed. `7a4af6e` makes `authorizeMediaAction` stop on a 401 instead of failing open (fail-open kept only for no network, timeout, 5xx, 404). Production order had to be frontend first, then backend.

Full original text (including the on-device test log) archived.

## 107. 2026-09-28 session — Security audit Group 4 step 5 + central 401 handling: DONE, live in production

Promoted in the agreed order. **Frontend first:** `c2cbbda` and `7a4af6e` cherry-picked onto `production` as **`43f2ba7`** and **`7c353e5`**. One conflict, in `useAuth.tsx`, resolved by keeping production's side, so the `.dev`-only debug tools stay off production — the only difference between `43f2ba7` and `c2cbbda` is comment wording inside those debug functions; `7c353e5` matches `7a4af6e` exactly. Published via `npm run update:production` (EAS update group `36201b40-3e60-4544-88d6-af44d79c85d0`), staged at 10%, verified on-device, then 100%; `master` fast-forwarded. **Then backend:** `develop` merged into `main` as **`6f687c8`**, bringing in only `cea19d5`'s `feed.routes.js`/`feed.controller.js`; no migration.

Live-verified against `api.orivori.com` with no login: `GET /feed`, `/feed/trending`, `/feed/trending/mantras`, `/feed/tags/popular` and `/feed/:id` return **401**; `/deities` and `/api/v1/health` still 200 (a bare `/health` returns 404, §123). Rechecked in code 2026-09-29: every feed-returning route in `src/routes/feed.routes.js` has `authenticate`; only the `view`/`play` counters are open, and they return only `{ success: true }`; `admin-feed.routes.js` isn't mounted; no categories routes exist.

**Still open:** `PREMIUM_GATING_ENABLED` on production needs a manual re-confirmation (Railway dashboard → backend service → Variables) — this session's CLI only had development access. **Group 4 now stands at 8 of 10** (with step 8, §108): only step 7 (App Check) and step 10 (lock `storage.rules`, gated on 7 and on rotating the existing permanent download tokens) remain. *(Update: step 10 done, step 7 skipped and token rotation dropped by founder decision, 9 of 10 — §112.)*

## 108. 2026-09-28 session — Security audit Group 4 step 8 (signed URLs for media): DONE, live in production

**Full detail in `Bhav_Bhakti_Security_Audit_Plan.md`** — this is a pointer/summary. Backend-only; no frontend change. Built on `develop` (`17b7c50`), merged to `main` (`5f2942e`), deployed to production (Railway deploy `b1b1ae72`) on 2026-09-28, confirmed working via an on-device production check.

Every feed response now returns V4 signed Cloud Storage URLs (`storage.googleapis.com/...?X-Goog-Signature=...`) for `url`/`thumbnailSquareUrl`/`thumbnailPortraitUrl`, expiring after **72 hours** (`SIGNED_URL_TTL_MS` in `src/utils/feedMedia.util.js`; `version: 'v4'` explicit — the library defaults to V2, which has no expiry ceiling). `applyMediaFields`/`serializeFeed` are now async; all 5 call sites in `feed.service.js` await them, guarded by `feed.service.serialize.test.js`.

**Shipped in a different shape than planned:** the plan had URLs minted at a delivery endpoint; they're actually minted at feed-listing time (every feed response), since autoplay needs a playable URL in the feed itself.

**Not done, still open:** the ~208 existing permanent Firebase download tokens were **not rotated** — old tokened links (and, until step 10 locks `storage.rules`, old token-free links) still work, so signing alone isn't access control yet. Steps 7 (App Check) and 10 (lock `storage.rules`) not started — with step 5 live (§107), Group 4 stands at 8 of 10. *(Update 2026-09-30, §112: step 10 done, so bare links now fail; tokens accepted as-is, no rotation; step 7 skipped — founder decisions.)*

**Known side effect:** images (thumbnails/wallpapers, plain RN `Image`, cached by URL) re-download more often, since the signed URL changes on every fetch. Audio is unaffected (cached on disk by feed ID, not URL); videos are not cached at all (§125). Measured and planned around in §125 (B1, day-stable signed URLs, postponed).

## 109. 2026-09-29 session — Meta (Facebook/Instagram) Ads SDK: DONE, live in production

**Live in production.** Plan and build log: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Meta_SDK_Plan.md`. Frontend-only.
- **`react-native-fbsdk-next`**, configured in `app.config.js` for the production package only; `src/utils/analytics/metaEvents.ts` is inert in `.dev` (a lazy `require` since `765b45f`, §123); the native module is in every build.
- **Events, all client-side, no parameters (no PII):** automatic install/app-open; a custom `login_success` on every login; Meta's `fb_mobile_complete_registration` (written as a literal, never read from the native module) only when `isNewUser` is true — both from `useAuth.tsx`.
- Verified on a Play Store install of v7. Only the Play App Signing key hash (Meta) and SHA-1 (Firebase) remain registered (debug entries removed 2026-10-14).
- `feature/meta-sdk` branched off `production` was a one-time exception to §85. Data Safety form and Advertising ID declaration done. Deferred: deferred deep linking, a Purchase event, Advanced Matching. Detail archived.

## 110. 2026-09-29/30 session — Storage reorganized, content sheet imported to production (173 live feeds), Khatu Shyam deity added

**DONE, live in production.** Data and Storage work only — no code changed. Sheet: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Feed_Import_Sheet.xlsx`; working files (generated import CSV, import log, original thumbnails) in `D:\bhav_bhakti_Claude_docs\archive\2026-09-29-content-migration\`.
- **Khatu Shyam = deity 22** in both databases (one-off insert, `sort_order` 21, before "Others" at 9999). **Don't run `create-deities-from-csv.js` against a live database** until `Content Upload Sheet - Deities.csv` is rewritten — it would blank icons, colours and other-language names on every existing deity and add Shani/Gayatri/Ashwatthama.
- **Storage:** 58 audio files copied into `Audio/<kind>/<Deity or miscellaneous>/` (`aartis`, `bhajans`, `mantras`, `mantras-extended` for the 108-times recordings, `chalisa`, `ringtones`), keeping content-type and download token. `Audio/` (capital A) is not the old lowercase `audio/` (deleted, §112) — sheet paths must match exactly. Two oversized thumbnails compressed in place (originals in the archive folder).
- **Import:** 181 rows → 150 created, 31 updated, 0 errors. Side effects: every feed's `subtitle` is now empty, and every feed is owned by user 2 (`DEFAULT_USER_ID`). Shiv/Hanuman Chalisa went in as `bhajan` (no chalisa type yet). A dedupe then deleted 8 byte-identical wallpaper duplicates, repointed feeds 1–8 to `Wallpapers/Static wallpapers/…` and renumbered 16 titles → **173 active feeds** (113 wallpaper, 27 ringtone, 13 bhajan, 12 mantra, 6 aarti, 2 thought). Only feeds 30/31 (the two videos) still use `other/`.
- **Running the importer against production:** `.env` points at dev and `confirm-db-target.js` needs a real keyboard, so the founder runs it in their own PowerShell: `$env:RAILWAY_TOKEN = $env:RAILWAY_TOKEN_PROD`, then `railway run --service MySQL -- node <wrapper>`, where the wrapper maps Railway's MySQL variables onto `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` and runs the importer (the wrapper isn't in either repo). The banner then correctly shows PRODUCTION.
- **Validate before importing:** the importer commits every good row even when others fail (a bad tag, a missing file or a type change silently drops that row), saves an unknown `type` as `general`, skips a row with no title without counting an error, and turns a blank or missing `views_count`/`likes_count` into 0 — which resets a live counter on update (confirmed in code, §111).
- **Still open:** the import sheet is stale against production (rows 1–8 still `other/…`, the 8 deleted rows still present, 16 old titles) — re-importing it as-is recreates the duplicates. Use the 2026-09-30 export CSV (§111) or regenerate from production first. `Content Upload Sheet - Deities.csv` is out of step with the live deities.

Full detail (thumbnail sizes, duplicate ids, verification) archived.

## 111. 2026-09-29/30 session — Dev content synced to production; weighted feed ranking live in production; new OTA rule

**Dev synced to production (2026-09-30)** from `D:\bhav_bhakti_Claude_docs\archive\2026-09-29-content-migration\production-feeds-export-2026-09-30.csv` (173 rows — the current, correct source for any re-import). Dev now matches production (173 feeds, same type mix, 22 deities). **Dev feed ids don't match production's — match feeds across the two databases by `csv_id`, never `id`.**

**Weighted feed ranking — DONE, live in production at 100% (§112).** Backend `develop` `4e83ebf` → `main` `f1a8db1`; frontend `dev` `503884e` → `production` `36f0fd6`.
- **Tables** (migration `20260930000001`, which seeds the defaults; read with plain SQL in `src/services/feedRanking.service.js`, no Sequelize models): `feed_weight_config` (`factor`, `target_key`, `weight`; seeded `media_type` audio 1 / image 2 / video 3, and `deity` by `deities.name` — ganesha, shiva, hanuman, rama, krishna 2, durga 1.5; anything without a row is 1) and `feed_campaign_overrides` (`name`, `target_type` = deity / media_type / type / tag, `target_key`, `multiplier`, `start_at`/`end_at`, `active` default 0). Campaign windows are **IST wall-clock values**, compared against IST computed in code (`getIstDateTimeString()`), never MySQL `NOW()`; `start_at` inclusive, `end_at` exclusive. Overlapping campaigns multiply. Invalid weights or unknown target types count as neutral and log `[feed-ranking]`.
- **`GET /feed?sortBy=weighted&seed=…`** (seed: 1–64 letters, digits, `-`, `_`; no seed → one per user per IST day). Loads every matching feed, ranks with the Efraimidis–Spirakis key `u^(1/weight)` (weight = media-type × deity × active campaigns, an open chain in `buildFactors()`), mixes, then slices the page; signed URLs only for the page returned. **Mixing** (`mixRuns()`, `src/utils/feedRanking.util.js`): never more than 2 in a row of the same media type (audio/image/video) or deity, relaxed only when nothing else is left.
- **App:** `src/utils/feedSeed.ts` — one seed per scroll session (new on a fresh open or pull-to-refresh). Home and the Thought tab (`useFeed`) and every Audio/Wallpaper hub chip, "All" and deity (`useRingtones`, `useAudioFeed`, `useWallpaperFeed`), use it. Liked, Search and Mantra Explorer are unchanged; `GET /feed/trending` now serves only Mantra Explorer's "All" chip and old installs. Newest-first no longer appears in the hubs.
- **Tuning (HeidiSQL, no redeploy — next request):** edit `feed_weight_config.weight`, or add a campaign, e.g. `INSERT INTO feed_campaign_overrides (name, target_type, target_key, multiplier, start_at, end_at, active) VALUES ('Janmashtami', 'deity', 'krishna', 5, '2026-09-04 00:00:00', '2026-09-06 00:00:00', 1);` (deities by `deities.name`, tags by `tags.key`; a mistyped name silently counts as 1x). On dev, 77% of Home's top 5 slots were visual — lower the `image` weight if Home feels too visual.
- Every weighted request loads the whole matching library — fine at 173 rows; revisit in the thousands. **Deferred to v2:** time-of-day boost, real pin mode (needs a `mode` column), soft deity cooldown, a single-feed campaign target.

**Standing rule (founder, 2026-09-30): Claude never runs an OTA update — not `.dev` (`preview` channel), not production.** Claude commits and pushes, then gives the founder the exact command plus what to check before and after. Dev: `$env:APP_VARIANT = "development"; npx eas-cli@latest update --channel preview --message "..."; Remove-Item Env:APP_VARIANT` (from `bhav-bhakti-fe` on `dev`). Production: `npm run update:production` from a clean `production` branch, then `npm run update:production:complete-rollout`.

Full detail (spec changes from the original brief and why, dev verification, rollout sequence, Storage cleanup plan) archived.

## 112. 2026-09-30 session (continued) — Home video/audio-card fixes live; old Storage folders deleted; `storage.rules` locked (Group 4 step 10, now 9 of 10)

**Home fixes — live at 100%** (`dev` `bb8e072` → `production` `75c3f61`; this update also carried §111's ranking).
- **Background audio:** an unmuted Home video kept playing after the app was backgrounded. expo-av's `shouldPlay` prop isn't reliably applied in the background, and the global `staysActiveInBackground: true` (`app/_layout.tsx`, deliberately left alone — it affects every expo-av player) disables expo-av's own pause-on-background. `AutoplayFeedCard` now calls `pauseAsync()`/`playAsync()` through a ref whenever `isEffectivelyActive` changes — the same fix §33 used in `ViewingWindowSheet`. **Lesson: drive expo-av video imperatively for background behaviour, not through props.**
- **Audio card layout:** title → thumbnail → play button + CTA pill, centred; title 2 lines max with §71-style line-height floors. Card height unchanged (`AUDIO_CONTENT_HEIGHT_RATIO` 0.75); `MAX_THUMBNAIL_SIZE` (0.66 of card width) shrinks on short screens instead.

**Storage cleanup — done.** Bucket 257 → 219 objects; lowercase `audio/` is gone, and 10 unused `other/` files too (its 2 videos kept — feeds 30/31, no other copy). The 3 unique, unused files deleted are backed up locally in `D:\bhav_bhakti_Claude_docs\archive\2026-09-29-content-migration\storage-backup-2026-09-29\audio\`. **Leftover to fix:** the example row in `bhav-bhakti-be/Content Upload Sheet - Feed TEMPLATE.csv` points at deleted `audio/aartis/…` files; the importer doesn't check that files exist.

**Group 4 step 10 — `storage.rules` locked, live** (backend `develop` `ea8f3d9` → `main`). Deny by default except `get` on `FCMImages/`. Signed links, tokened links and the Admin SDK still work; bare `?alt=media` links return 403. Founder decisions: App Check (step 7) skipped, token rotation dropped. Full record in `Bhav_Bhakti_Security_Audit_Plan.md`.
- Both apps share one bucket, so rules were tested in the Storage emulator instead: `npx firebase-tools emulators:exec` with a demo project, using Java 21 from `D:\Android Studio\jbr` (system Java 1.8 is too old).
- The founder publishes rules in Firebase Console → Storage → Rules (Claude Code lacks Rules permissions); rollback = republish from git history or the Console's rules history. Verified live after publishing.
- Side effect: the unused admin upload route's response still builds a bare link, which no longer opens.

**Access note:** Claude Code may run read-only production database checks with `RAILWAY_TOKEN_PROD` (`railway run --service MySQL`, with a SELECT-only script that refuses to run outside production). Production writes still go through their typed-confirmation scripts and an explicit go-ahead.

Full detail (root-cause trace, per-folder delete lists, emulator and live test results) archived.

## 113. 2026-10-01 session — Player fixes live in production (replay auto-start, stale queue, mantra first-play repeat, Up Next); audio "views vs plays" open

Frontend-only, live at 100%, founder-confirmed on `.dev` and production.
- **Replay auto-start** (`dev` `51382cd` → `production` `215eadf`): replaying the same track after ✕ opened paused, because the never-unmounted player's auto-start fired once per track per session. Every autoplay entry point now sends a fresh `playRequestId` (`src/utils/playRequest.ts`); the player acts once per request (`lastHandledPlayRequestRef`) and ignores a request for the track already playing or loading (`togglePlayback` is a toggle). Only the auto-start effect reads `playRequestId` — highlighting, queue and Up Next never see it.
- **Stale queue, mantra first-play repeat, Up Next** (`dev` `0c5d48b`/`2e8db9d`/`54576f4` → `production` `2a6ebc9`/`1277010`/`6b293f2`): the player drops the queue when the opened track isn't the queue's current item; Home's Listen pill now sends `type`/`isRepeatable`, and auto-repeat is re-decided once the fetch lands; the "Up Next" handle isn't rendered without a queue of 2+. **Lesson: never call `dismiss()` on a `@gorhom/bottom-sheet` BottomSheetModal that may never have been presented** — in 5.2.14 it sticks in DISMISSING and ignores every later `present()`.
- **Parked:** a queue for Home's Listen (per-session hub seed, start at the tapped track, wrap round) — proposal only.
- **Pending product decision — audio "views" vs "plays":** the player shows a views pill and counts views for audio up to 3 times per tap (the list's tap handler, `fetchFeedData`, `togglePlayback`). A plays counter exists but is barely used: `feeds.plays_count` and `POST /feed/:feedId/play` (open, no login), called only by `AutoplayFeedCard`; `playsCount` is never displayed. Firebase has only `content_progress`/`first_content_completed`. Open: what counts as a play (start, N seconds, full listen)? Do Home's 30s previews, mantra loops, or replays after ✕ count?

**Standing rule (founder, 2026-10-01): no default device testing.** Claude uses an emulator or device only when explicitly asked for a specific task; the founder tests on their phone, and Claude hands over the OTA command plus a testing checklist. The local `Pixel_10` emulator has the `.dev` app; the Firebase test number is never written into docs or commits.

Full detail archived.

## 114. 2026-10-01 session — Security audit Group 7 (dependency fixes): DONE, live in production; Expo SDK upgrade parked

Full record in `Bhav_Bhakti_Security_Audit_Plan.md` (Group 7 build log).
- **Backend:** `npm audit fix` (`main` merge `7c80569`; `firebase-admin` 14.5 moves `@google-cloud/storage` to 8.2, which needs **Node ≥ 22**), `sharp` 0.35.5, unused AWS packages removed. 2 moderate findings remain (`sequelize`'s bundled `uuid`, not reachable as used).
- **Frontend:** JS-only packages updated by name, incl. `axios` 1.20.0 (`production` `11f2056`). 24 findings remain (the Expo chain, never-imported Firestore's `grpc-js`, build-time `image-size`).
- **Expo SDK 54→57 deliberately parked** as its own project: `expo-av` is gone in SDK 55 (6 video files → `expo-video`), the 266-line `expo-audio` native patch needs re-porting, every native module needs compatible versions, and it needs a Play Store build.
- **`bhav-bhakti-fe/.npmrc`'s `force=true` removed** (`legacy-peer-deps=true` stays): it made every npm command act like `--force`. **Before any frontend OTA, diff the lockfile for native packages.**
- **Testing admin-only upload routes on dev:** temporarily set dev user 30 (founder's test account) to `role = 'admin'` via a script that refuses unless `.env` points at dev; mint a 10-minute JWT inside `railway run -s bhav-bhakti-be -e development` so `JWT_SECRET` is never printed; call `/upload/media` and `/upload/optimized-image` on `api-dev`; delete the uploads; restore `role = 'user'`. Check deploys with `railway deployment list -s bhav-bhakti-be -e development|production` (production via `RAILWAY_TOKEN_PROD`).
- Noted, not changed: `GET /upload/config` is public (limits and types only). The nightly backup service kept its pre-Group-7 image until it was redeployed on 2026-10-23, which exposed a file missing from `Dockerfile.backup` (§128).

## 115. 2026-10-01 session — Wallpaper downloads go to a "Bhav Bhakti" album with an already-saved check; hardware back no longer minimizes the app: live in production

Frontend-only, JS-only: `dev` `a04fa15`/`6f0aef6` → `production` `769a36d`/`c81c5b2`, 100%, founder-confirmed (13 on-device checks).
- **Downloads** (`a04fa15`): they used to land in `DCIM/` under timestamped names with no duplicate check, so repeats piled up and gallery apps hid the identical copies. New shared `src/utils/saveFeedToGallery.ts` (used by `useWallpaperActions.ts`, `AutoplayFeedCard.tsx`, `FeedCard.tsx`; ringtone saves are separate) saves to a "Bhav Bhakti" album (`Pictures/Bhav Bhakti/`, `GALLERY_ALBUM_NAME` — the first save creates it from the file, so nothing passes through DCIM and no permission dialog appears) as `bhav_bhakti_<feedId>.<ext>`. If that name is already in the album, nothing is downloaded or counted and "Already saved" shows (the check runs before `authorizeMediaAction`). A failed album lookup saves anyway; a failed album save falls back to DCIM; a non-200 download now shows the error alert. The dead `downloadWallpaper.ts` was removed. Pre-fix downloads aren't recognised. Handoff item 10 (a downloaded wallpaper won't open) was not re-tested.
- **Back button** (`6f0aef6`, Handoff item 11): inside Tabs, `router.replace()` becomes a tab jump, and expo-router 6.0.24's `tabRouterOverride` then removes `history[index - 1]` using the tab's position in the bar — losing Home for Mantras and Audio, so a second back press minimized the app. Fixed by `router.replace` → `router.navigate` in the `returnTo` back handlers of `audio-player.tsx`, `search-results.tsx` and `horoscope-detail.tsx`; the `returnTo`/`returnParams` mechanism is unchanged. `verify-otp.tsx`'s post-login `replace` is correct (it crosses navigators).
- **Rule: inside `(main)`'s Tabs, never `router.replace` to a different tab — use `router.navigate`.** `replace` is fine across navigators or to re-target the same route.

Full detail archived.

## 116. 2026-10-01 session — Shares carry the real Play Store link; audio and Rashifal shares send a caption, not the content: live in production

Frontend-only, JS-only: `dev` `d8ae5aa` → `production` `381413f`, 100%, founder-confirmed.
- The placeholder `bhavbhakti.app/download` is replaced by `PLAY_STORE_URL` (`src/shared/config/appStoreLink.ts`) — always the production listing, also from `.dev`.
- `shareContent()`'s `buildShareCaption(feed)`: per-type captions for mantra/aarti/bhajan/ringtone (`common.shareCaptionMantra`/`Aarti`/`Bhajan`/`Ringtone`, English and Hindi, title in the app language), sent with the **thumbnail image, never the audio**. Wallpaper, thought, video and title-less feeds keep "Shared via Bhav Bhakti — {link}" with the real file.
- The full player, `RingtoneFeedCard` and `FeedCard` moved from RN `Share.share` (which on Android drops `url`) onto `shareContent()`. New option `onShareRecorded` lets the player update its own share count. These shares now download the thumbnail first and log `content_shared`.
- Rashifal shares a one-line `horoscope.shareCaption` (text-only `Share.share`) instead of the whole reading.
- The receiving app decides whether to keep the caption (WhatsApp does; Instagram drops it). No other store link exists in either repo (no invite or rate-us feature, none in Profile). An audio feed imported without thumbnails would share text only.

Full detail archived.

## 117. 2026-10-05 session — Maintenance-mode kill switch and a short About-screen update tag: live in production

**Build.** Backend `develop` `fde067e`, merged to `main` as `4d76323` (production deploy `c87a603e`). Frontend `dev` `fab469f` (maintenance mode) and `4156bab` (About screen), cherry-picked to `production` as `92a4c03` and `67b368e` (identical patches); `master` fast-forwarded to `67b368e`. Production OTA update group `0a555358-2008-4f15-9690-2113372aa86c`, rolled out to 100%. JS/backend only — no packages, no native change. Tested by the founder on the `.dev` app against Railway dev (on, message shown, Hindi fine, hardware back exits, Retry stays while on, Retry recovers once off). Source of the switch instructions below: "How the maintenance switch works" in `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Immediate_Plan_2026-09-30.md`.

**How the maintenance switch works:**
- Two Railway variables on the **backend service (`bhav-bhakti-be`)**, in the environment to affect (dev for testing, production for real). They don't exist in normal operation — a missing variable means maintenance is OFF.
- **Turn on:** Railway → project → the right environment → `bhav-bhakti-be` → Variables → add `MAINTENANCE_MODE` = `true`. Only exactly `true` (trimmed, any case) turns it on; any other value means off (`src/utils/featureFlags.util.js`, unit-tested). Optionally add `MAINTENANCE_MESSAGE` (free text, capped at 300 characters, shown under the screen's built-in translated title and body — so don't repeat "we'll be back soon"; write specifics like "Back in about 30 minutes"). Deploy; the service redeploys, and the variables are read once at startup.
- **Verify:** `GET <api base>/v1/feature-flags` must show `"maintenanceMode":true` before trusting the app. Dev: `https://api-dev.orivori.com/api/v1/feature-flags`; production: `https://api.orivori.com/api/v1/feature-flags`.
- **Turn off:** delete `MAINTENANCE_MODE` (and the message) or set it to `false`; redeploy; confirm the URL shows `false`.
- **How the app reacts:** it checks on every cold start, holding the splash screen until the check settles, capped at 1 second (after that the app shows normally, and a later "maintenance" answer swaps the screen in). It re-checks on returning to the foreground, at most every 5 minutes. Users on the screen can tap Retry. The screen replaces the whole navigator (`app/_layout.tsx` renders `MaintenanceScreen` instead of the root `<Stack>`, providers kept), so back, deep links and notifications can't reach the app underneath; hardware back exits the app. When the flag goes off, the navigator remounts fresh through `app/index.tsx`.
- **Limits:** only app versions containing this update react; the switch lives in the backend, so it doesn't help if the backend itself is fully down (users then see each screen's own error); a user who only resumes a long-backgrounded app sees the change within about 5 minutes of returning.

**App pieces:** `src/store/featureFlagStore.ts` (`maintenanceMode`/`maintenanceMessage`, `status` checking / ok / maintenance, overlapping fetches share one request, `refetchOnForeground()` throttle); `src/components/molecules/MaintenanceScreen/` (en/hi strings under `maintenance.*`, §71 line-height floors); the guard in `src/utils/notifications/deepLink.ts`.

**Deviations from the spec, and why:**
- **Paywall and session-expired login prompt aren't mounted during maintenance** — both are full-screen modals that would cover the maintenance screen, and both navigate into a navigator that doesn't exist then.
- **Notification taps:** the cold-start tap is now handled once the screens actually exist (the splash can be held for up to 1s first); any tap during maintenance is ignored.
- **About keeps its "Published:" line** — only the full update ID and the raw channel name were asked to go.
- **Failed checks fail open:** a failed cold-start check lands on `ok` (the app behaves exactly as before the feature); a failed re-check never changes the current state. Only a real boolean `true` from a successful response turns maintenance on.

**Deliberately not built: a "can't connect" screen.** Without NetInfo (a native package) the app can't tell a phone being offline from the server being down, so such a screen risks false positives for users on flaky networks, locking out people the app could otherwise serve. A failed flag check behaves exactly as before. Can be added later.

**`optionalAuth` removed from `GET /feature-flags`** (`src/routes/featureFlag.routes.js`): nothing read `req.user`, and with a token attached, the auth middleware returned 401 for an expired login (hiding the flag and triggering the session-expired prompt) and 500 while the database was down (the user lookup) — exactly the cases maintenance mode must cover. The endpoint now never touches the database; it stays behind the shared 300/min content rate limit. **Per-user flags (e.g. test-account-only rollouts) would need it back.** Not a Premium-pipeline dependency: Premium status comes from `GET /subscription/status`, enforcement from `PREMIUM_GATING_ENABLED`.

**About screen** (`app/(main)/profile.tsx`): `Bhav Bhakti v1.0.0 (xxxxP)` — the last 4 characters of the running OTA update ID plus one channel letter, read from `expo-updates`' `Updates.channel` (set per build from `eas.json`): `P` = production, `D` = preview (the `.dev` app), `?` = anything else. The embedded build (no OTA applied, no update ID) shows the version only. `versionName` is unchanged — it can only change with a native build (deferred).

**Not in scope, still open (Immediate Plan doc):** a `versionName` scheme (next native build), deep linking (its own session). The force-update / "update available" prompt is now built and live (off until its Railway variables are set) — see §126.

## 118. 2026-10-05 session — Co-founder feedback pass: deity names, content-only chips, Status share pill, ringtone save flow: live in production

Backend `develop` `606fa9b`, `914b177` → `main` `e4ad3ce`. Frontend `dev` `c3d50ea` → `production` `c33cad8`; `fcbab4f`, `9ff5f22` → `6e17767`, `c9b4581`; `16d4ee6` → `f6c16ba`. `master` = `production` = `f6c16ba`.
- **Deity names:** devotional display names (Shiv Ji, Maa Lakshmi, Khatu Shyam Ji…) set by `scripts/update-deity-display-names.js` (dry run by default; `--target production` asks for PRODUCTION and backs up `deities` to `archive/` first). Only `deities.display_name` changed. **Never change `deities.name`** — ranking weights and campaigns, analytics, the chip order and the CSV script key on it. **Don't run `create-deities-from-csv.js`** — it would overwrite the names.
- **Chips:** `GET /deities?hasContent=true` (5-minute server cache; the app falls back to the full list) — chips show only deities with active content, at most 8 in the row, "More" only beyond that. Chip labels and Aarti/Bhajan/Ringtone titles wrap to two lines; chip strings translated (`deityFilter.*`).
- **Home wallpaper cards:** labelled "Status"; the wallpaper and thought pill is "Set as Status" and calls `shareContent()`; "See all" opens the Status sub-tab; the set-as-wallpaper code and strings removed.
- **Sound settings:** new `src/utils/openSoundSettings.ts` (`expo-intent-launcher`) — both ringtone cards open Android's Sound settings.
- **Ringtone save (Android only):** new `src/utils/saveRingtoneToDevice.ts` saves into a media-library album named exactly "Ringtones" (`Music/Ringtones/`, which Android flags as a ringtone) as `Bhav Bhakti - <English title>.mp3`, with an ASCII-name retry, a duplicate check before the premium gate and one translated alert.
- **Still open:** Home ordering diversity (done, §119); a search alias (laxmi → Maa Lakshmi); cancelled shares counted as shares; the audio pill's Hindi line height (§71); the English-only Status share caption; 3 production ringtones with Hindi embedded title tags (content team).

Full detail in the commit messages.

## 119. 2026-10-06 session — Home first-10 guarantee (one of each content type): live in production

Backend only: `develop` `e6ff90d` → `main` `5cc1f8d`. No app, schema or response change.
- **What:** the first 10 Home items always include the best-ranked ringtone, aarti, mantra, bhajan, wallpaper (video wallpapers count) and thought that have live content; a type with none is skipped and its slot goes to the next best feed. Weights, campaigns and the seed decide each representative, as before.
- **When:** every `GET /feed?sortBy=weighted` with no type, deity, tags, tag-group or creator filter, **at every offset** — it reshapes the whole ranked list before the page is cut, so pages of one seed never repeat or skip. Home is detected implicitly by "no filters" (`isHomeRequest` in `feed.service.js`); any new unfiltered weighted caller would get it too. Hubs, Thought, Liked, Search and Mantra Explorer are unchanged.
- **How** (`feedRanking.service.js`/`feedRanking.util.js`): `splitGuaranteedTop()` builds the top set (`HOME_TOP_SIZE = 10`, `HOME_TOP_TYPES`), skipping fillers that would put more than 7 of one media type or deity in the 10; the top 10 is mixed on its own by `mixRunsExact()` (backtracking — the greedy `mixRuns` broke the max-2 rule in ~2% of seeds on a set this tight), falling back to `mixRuns` if no valid order exists; the rest is mixed with `mixRuns(…, alreadyPlaced)` so the rule holds across slots 10/11.
- **Tuning:** unchanged — `feed_weight_config` in HeidiSQL (e.g. lower the `image` weight if the 4 open slots feel too visual).
- **Known content gap:** only 2 live thoughts, so one of the same two appears in the top 10 on every Home visit; aarti (6) repeats often too.

## 120. 2026-10-06 session — Stories phases 1–5: dev/develop only, NOT on production or main

Full plan and phase tracker: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Stories_Plan.md`.
- **Data (Option A):** stories are `feeds` rows, type `stories`. A series row has no audio (cover in the thumbnails); episodes carry `series_id` + `episode_number`; one-offs have neither. `cover_video_url` exists for later.
- **Backend phase 1** (`develop` `9920d9b`; migration run on dev only): shared `FEED_TYPES`; `HOME_FEED_TYPES` excludes stories; `listableFeedWhere()` (active, type rule, never an episode) on every list path; `GET /feed?seriesId=` returns episodes in order, only for an active series; series rows get `episodeCount`. `/tags/popular` now counts only listable feeds.
- **Importer** (`develop` only): series rows import first and need a cover thumbnail; story shape can't change on re-import; **counters are never written when updating an existing feed** (all types). Production's importer still resets them until develop is merged.
- **Content:** Hanuman Immortal series + 8 episodes on the DEV database only (csv ids 201–209); files in Storage `Stories/hanuman-immortal/`. The Feed Import Sheet xlsx was refreshed from dev.
- **Frontend** (`dev`): the Stories tab replaces Rashifal in the bar (Rashifal screens kept, reached from Home); Stories page + series screen (`58952a9`); story player — Next/Previous, auto-advance, Up Next, speed pill instead of the views eye, no shuffle/repeat/counter (`56b3721`, `1875ca0`, `2206623`). Shared `src/utils/openAudioPlayer.ts`. Speed applies only where a speed control is visible (Aarti/Bhajan always 1x). Mantra speed button is now icon + speed text.
- **Not done:** Home/search stories (phase 6), the launch gate (phase 8, production migration + release). Cover video deferred (short looping Home thumbnail idea only).
- **Parked:** rethink views — the eye is in the player, `AutoplayFeedCard` and `FeedCard`; removing it is ~30–45 min; tied to the views-vs-plays decision (§113).

## 121. 2026-10-06 session — Player auto-advance lost the queue: fixed, live in production (v8)

Fixed (`dev` `f2c92f2` → v8 `ce67a95`, §122). When a track ended, the next one opened with no queue: `didJustFinish` stays true on Android while ended, and `advanceQueue()` changes a dependency of the end-of-track effect, so it advanced twice and §113's clean-up dropped the mismatched queue. A "finish already handled" flag at the top of the effect fixes it.

## 122. 2026-10-09 — Play rejection fix, v8 build, Play Console state

- **Rejection:** Google rejected `versionCode` 7 (READ_MEDIA_IMAGES/VIDEO, Photo and Video Permissions policy). Cause: our hand-written permission list, the `expo-media-library` plugin defaults and library manifests.
- **Fix (`dev` `a9d0678`):** removed READ_MEDIA_IMAGES/VIDEO/VISUAL_USER_SELECTED, RECORD_AUDIO and ACCESS_MEDIA_LOCATION; added `blockedPermissions`; wallpapers on Android 13+ use a write-only request, ringtones request audio only. READ_MEDIA_AUDIO and READ/WRITE_EXTERNAL_STORAGE kept. Known consequence: the wallpaper "Already saved" check can't read the gallery on Android 13+, so repeat saves download again (accepted, no fix planned).
- **`expo-application`** added (`3c1765f`) so a later update prompt can read the real versionCode — import it inside try/catch.
- **v8 on `production`:** `ce67a95` (auto-advance fix, §121), `7cbedc2` (permissions), `210865e` (expo-application), `cc2fe58` (versionCode 8; `version` stays 1.0.0). Production EAS build `92041ff4-261a-4228-94ad-c92212a30d16`; the built AAB was inspected directly and has none of the removed permissions.
- **Play Console:** v8 is on Internal and Closed testing, and was approved by Google and published to Production on 2026-10-11 at 13:53 IST via Managed publishing (§124). The earlier rule "don't cherry-pick onto `production` until Google approves v8" is lifted.
- An old CLAUDE.md is tracked on `production`/`master` (from an old "§84" commit); left in place, decide later.

## 123. 2026-10-09 — .dev splash hang (Meta SDK), Premium popup, Edit Profile back, Railway

- **Splash hang:** the fresh `.dev` build hung on the splash because `metaEvents.ts` imported `react-native-fbsdk-next` at load time and `.dev` has no Meta plugin/App ID, so the native module threw before RootLayout. Fix on `dev`: `765b45f` (lazy `require` in try/catch, only when `appVariant === 'production'`). **Rule: any native module added to the shared `package.json` must be tested on a `.dev` build first.**
- **Live in production since 2026-10-11:** `dev` `0ead152` → `production` `0cc2a00` — Premium coming-soon popup via `PREMIUM_PURCHASE_AVAILABLE = false` in `PremiumPaywall.tsx` (the old paywall faked a purchase; keep `PREMIUM_GATING_ENABLED` off until real checkout exists); `dev` `5010f3c` → `production` `3dfe44b` — Edit Profile hardware back returns to Profile. OTA update group `7d258f81-3ae2-4faf-8335-9ce401ae5628` (10%, then completed to 100%); `master` fast-forwarded to `3dfe44b` on 2026-10-11.
- **Railway:** backend health check path is `/api/v1/health` (not `/health`, which 404s) on dev and production, 300 s timeout; production MySQL volume resized to 5 GB (limit is per volume, billed on use); usage soft alert $20 / hard limit $50.
- **Razorpay:** the company is now GST registered; plan is to build and test checkout on `.dev` first with Razorpay test keys, then a production native build.

## 124. 2026-10-11 — Launch day: v8 live on the Play Store, Meta app published

- **v8 live** 2026-10-11 at 13:53 IST (Managed publishing). Public listing: `com.orivori.bhavbhakti`. The store description had a stray drafting line; the founder removed it and resubmitted the listing for review.
- **Meta developer app:** privacy policy, contact email, icon and category filled in, and the app published (the dashboard's Publish button is the old Live switch). Android platform entry = `com.orivori.bhavbhakti`. The temporary debug key hash (Meta) and the debug SHA-1 (Firebase) were confirmed removed on 2026-10-14; only the Play App Signing entries remain. Data Safety form confirmed done. The co-founder runs the ads.
- **Where to see numbers:** Play Console → Statistics (true installs; lags about a day); Firebase Analytics `first_open` and New users; Meta Events Manager (app opens and `login_success`); the database (registered users).
- **Closed testing** track kept for testing v9; testers are removed through the tester email list.

## 125. 2026-10-14 — Crashlytics investigation and the video-memory fix (Stage 1): live in production

Full reference: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Media_Memory_Investigation_2026-10-14.md`.
- **Firebase MCP server** added to Claude Code (user scope, `--only core,crashlytics`, logged in with `firebase login`). Used read-only: no Crashlytics notes and no issue-state changes. Gemini in Firebase and CLI usage reporting declined. It reads Crashlytics but not Play installs.
- **Findings:** v8 crash-free users about 94.4% (14 of 252). 4 of 8 issues are out-of-memory (13 of 20 crashes: `okio.Segment`, ExoPlayer `AudioTrackPositionTracker`, `MediaCodec.getBuffer`), plus a SIGABRT in `libc.so` (7 users) clustered around the Wallpapers hub — unreadable, since no native symbols are uploaded. Baseline 13–14 Oct (before the fix): 12 crashes, 267 users.
- **Cause:** hub grids kept 10+ video tiles playing (unconditional `shouldPlay`, default `windowSize` 21); Home kept about 10 cards with loaded video players (`windowSize` 10); full-size originals everywhere (wallpapers median 2.8 MB PNG at 1024×1536, about 6.3 MB decoded; videos 720×1280 at 3–11 Mbit/s with the index at the end of the file); no wallpaper or video has a thumbnail. Images use plain RN `Image` keyed by URL, so the 72-hour signed URLs (§108) defeat the cache — **expo-image is NOT installed**. Videos aren't cached at all (expo-av). Audio is cached by feed ID, with four small leaks: double download on first play, Home's 30 s previews download then discard, ringtones cached under two names, and the 14-day sweep.
- **Fix shipped (Stage 1, JS-only):** `dev` `c268b98` → `production` `d25bb7c`; production OTA update group `a37ff9d2-d368-4dbd-a05c-ed76b4e0e564` on 2026-10-14 (10%, then 100%). Hub grids (Status/Wallpapers/Thought) create a video player only while a tile is at least half visible, at most 4 playing, and only while the hub is focused (new `src/hooks/useVisibleVideoTiles.ts`; `WallpaperFeedCard`'s `shouldMountVideo`). Home mounts players only for the active card and one neighbour each side (`FeedList` → `AutoplayFeedCard` `shouldMountVideo`). `windowSize` 5 on the hub lists and on Home (other `FeedList` screens unchanged). Crashlytics custom keys `ota_update` (short tag, same as Profile > About) and `ota_update_id` set at app start (`app/_layout.tsx`); a crash with no key ran older code.
- **Trade-offs:** a cream tile shows before playback; videos reload on re-entry (no video cache); the Viewing Window doesn't pause the grid behind it; Search Results' wallpaper cards still play every video.
- **`master` intentionally NOT fast-forwarded** to `d25bb7c` until the Crashlytics check (about 17 Oct and 21 Oct: crashes per day per issue against the baseline, split by `ota_update`).
- The `.dev` app's **"Test crash (Crashlytics)"** button is in Profile → "Debug (.dev only)", just above Logout.
- **Paused plan:** Stage 2 = `sharp` WebP variants into the shared bucket plus `thumbnail_portrait_url`/`thumbnail_square_url`, dev database first, then an OTA, then the production database; videos start with a lossless faststart remux. B1 (day-stable signed URLs) postponed. C1 (expo-image) and native crash-symbol upload go in v9.

## 126. 2026-10-15 — Update-available prompt: live in production, OFF until Railway variables are set

Full rules, the production turn-on order and the test table: "UPDATE PROMPT" section of `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Handoff.md`.
- **What:** a dismissible soft prompt when the installed build is below the latest; a full-screen hard block (`UpdateRequiredScreen`, swapped in like `MaintenanceScreen`) below the minimum. Both open the **production** Play listing through `openStoreForUpdate()` in `src/utils/appUpdate/` — v9 can swap Google's in-app update API in there.
- **Flags:** Railway variables on `bhav-bhakti-be`, served by `GET /feature-flags`: `UPDATE_PROMPT_ENABLED` (exactly `true`), `ANDROID_LATEST_BUILD`, `ANDROID_MIN_BUILD` (whole numbers 1–9999; the minimum is ignored unless a valid latest is set and min ≤ latest). Missing = off. Each variable edit redeploys the backend — check the flags URL after every edit.
- **Installed build:** lazy try/catch `require('expo-application').nativeBuildVersion` (v8 = 8; the `.dev` app = 4; module missing = older than 8; unreadable = never act). **Never use `Constants.expoConfig.android.versionCode`** (it comes from the OTA, so it says 8 everywhere).
- **Behaviour:** runs only on production builds and the `.dev` app (never a local `__DEV__` bundle); any fetch error or odd value = nothing; maintenance mode wins; the soft prompt appears only at calm moments (Handoff section).
- **Rule:** never raise `ANDROID_MIN_BUILD` until the new build is at 100% on Play. Production variables stay unset until v9 is live.
- **Commits:** backend `develop` `2ac2396` → `main` `402e535`; frontend `dev` `c353c03`, `c5be104`, `0d419dc` (+ the `.dev`-only debug row `bcda6ca`, not cherry-picked) → `production` `367fe3f`, `028c10e`, `bee72ca`.
- **Known gap:** the soft prompt's main-tab list (`MAIN_TAB_PATHNAMES`, `updateDecision.ts`) came from `dev`, where Stories replaced Rashifal — on production `/horoscope` is missing, so the soft prompt never appears on that tab. Add it before switching the prompt on; re-check the list when Stories reaches production.

## 127. 2026-10-22 — §125 check, Search/video fixes: live in production

JS-only OTA: `dev` d5df45a..d323da6 (6) → `production` 40dea53..48f86e2; `master` = `production` = `48f86e2`. Crashlytics: OOM 6 → 1, ANRs 3 → 0; `libc.so` SIGABRT at the Wallpapers hub unchanged (symbols in v9). Grid videos pause under the Viewing Window; Search Results plays only visible ones (`limitVideoTiles`); Search back and the player round trip keep `returnTo`; "Up Next" opens on tap; Ringtones/Status texts translated. **Rule:** a hidden-tab screen reading `returnTo` needs a `useFocusEffect` BackHandler.

## 128. 2026-10-23 — Railway security incident: all secrets rotated

Railway reported a breach of stored environment variables (status.railway.com/incident/QH8L8B3E), so every real secret in use was rotated on 2026-10-23 and the old values revoked; the Razorpay test keys were not rotated, and the unused leftover AWS/OTPless/Google keys were removed from Railway but not revoked at their issuers. Full map: `Railway_Credential_Rotation_Map_2026-10-22.md` in the docs folder.
- One new Firebase service-account key (key ID starts `6b6312ba`) is used by the production API, the dev API, the backup service and the laptop's `src/config` file; the July and September keys are deleted.
- **Database:** new passwords in both environments (old ones discarded via MySQL's `RETAIN`/`DISCARD OLD PASSWORD`). The MySQL service's `MYSQL_ROOT_PASSWORD` is the source; the backup service follows it by reference, but the API and the horoscope service hold hand-copied `DB_PASSWORD` values, so rotate all of them together. New `JWT_SECRET` (everyone logged out once), Gemini key, Railway tokens (the old ones were invalidated by Railway). Leftover `AWS_*`/`GOOGLE_*`/`FACEBOOK_*`/`OTPLESS_*` variables were deleted from Railway.
- The horoscope cron service was renamed from "alert-transformation" to "daily horoscope".
- **Found and fixed** (`64e85d1` on `main`): `Dockerfile.backup` copies a hand-picked list of files, and it was missing `src/config/storage.config.js`. Any new `require` inside `firebase.config.js` must also be added to `Dockerfile.backup`.
- **Open, noted only:** `.dockerignore` excludes `package-lock.json` (the API installs by version range); the API `Dockerfile`'s `HEALTHCHECK` calls `/health`, which 404s.

## 129. 2026-10-28 — A1 "last v8 update": counter default 11, baseline events — on `production`, OTA pending founder

JS-only, frontend only. Tested by the founder on `.dev` (visual checks and Firebase DebugView passed). `dev` `511dd0b`, `76bdfac`, `6dc580d`, `2f16aab` → `production` `20671e9`, `00c02f7`, `9d001bd`, `ff0153f` (cherry-picked with `-x`, no conflicts, pushed); `master` still `48f86e2`. **`765b45f` (lazy Meta SDK load) deliberately not cherry-picked** — founder decision; production loads the Meta SDK fine.
- **Counter default 108 → 11** (`AudioPlayerSheets/chantTargets.ts`): chips 11/27/108, "More" 11–1008; the counter stays free and un-gated. Not saved between opens, so it applies from each user's next mantra open.
- **Firebase events:** `counter_viewed`, `counter_opened`, `counter_target_changed`, `counter_milestone` (11/108/other, once per open = feedId + playRequestId; `src/hooks/useChantCounterAnalytics.ts`); `screenshot_taken {content_type}` (detection only, Android 14+ only; screens declare their type via `useScreenshotContentType`, `src/utils/analytics/screenshotEvents.ts`). Repeat counter use: GA4 cohort exploration on `counter_viewed`.
- **Back with a sheet open** (dev `7e01156`, not yet on production): Android back/edge-swipe in the player now closes the topmost open sheet (counter, More targets, Up Next - all three had the bug) before navigating; `src/hooks/useSheetBackStack.ts` tracks open sheets from their own onChange/onDismiss (§113-safe).
- **Update prompt:** `MAIN_TAB_PATHNAMES` gains `/horoscope` and keeps `/stories` — correct before and after Stories ships (closes §126's known gap).
- Next steps (A2–A7, AdMob plan): `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Roadmap_2026-10-15.md` ("Decisions of 2026-10-25") and `Bhav_Bhakti_Revenue_Model.md` §5d.

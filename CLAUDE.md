# Bhav Bhakti — Project Context

*Last verified against actual code/config: 2026-10-05 (§117 checked against the commits, branches and the production endpoint; §113–§116 against the commits, branches and Railway deploys; §110–§112 against the production and dev databases, the Storage bucket and the commits; the rest of the file last had a full staleness pass on 2026-09-29). Condensed again on 2026-10-05 (eighth pass — see the archive's note of that date). Newest, all live in production: §118 co-founder feedback pass (deity names, content-only chips, Status share pill, ringtone save flow); §117 maintenance-mode kill switch + a short About-screen update tag; §116 share captions with the real Play Store link; §115 wallpaper downloads to a "Bhav Bhakti" album + the back-button-minimizes-the-app fix; §114 security audit Group 7 (dependency fixes; Expo SDK upgrade parked); §113 player fixes; §112 `storage.rules` locked (Group 4 step 10); §111 weighted feed ranking + the founder-runs-every-OTA rule; §110 content import (173 live feeds).*

*Still-open items carried forward:* **§87 — `isPremium` is permanently `false` for every user** (the Premium pipeline's frontend, wiring up the already-built `GET /subscription/status`, was never built) — HIGH PRIORITY for the next Premium session. **Security audit:** every group is complete. Group 4 is 9 of 10 — step 7 (App Check) deliberately skipped and permanent Firebase download tokens accepted as-is, no rotation (founder decisions, §112); Group 7 done apart from the Expo SDK 54→57 upgrade, parked as its own future project (§114). `Bhav_Bhakti_Security_Audit_Plan.md` is authoritative. **Play Console:** the Data Safety form, the Advertising ID declaration and the foreground-service declaration are done; the "Apply for production" application is submitted and awaiting Google's review. **Content (§110/§111):** the import sheet must be brought in line with production before any re-import, or it undoes the dedupe; the Feed TEMPLATE CSV's example row points at deleted files (§112). **Product decision pending:** audio "views" vs "plays" (§113). **Claude never runs an OTA update, dev or production — the founder runs every one (§111); no device testing unless explicitly asked (§113).** **§85 is the standing branch workflow:** everyday commits on `dev`; `production` receives only cherry-picks from `dev` once tested; real production pushes only from `production` (`npm run update:production`); `master` fast-forwarded from `production` once confirmed live.

*Condensing history:* this file was condensed on 2026-07-29, 08-13, 08-20 (twice), 09-10, 09-14, 09-29 and 10-05. The full original text of every condensed or rewritten section is preserved in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

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

Daily Rashifal content is AI-generated: `scripts/generate-daily-horoscopes-gemini.js` generates English with Gemini (`temperature: 1.4`, §90), then translates that exact content into Hindi (§55). A Railway cron runs it nightly with `TZ=Asia/Kolkata` (§66) — in production that's the service named `alert-transformation` (Railway's auto-generated name), which redeploys alongside `bhav-bhakti-be` on every push to `main`. The old third-party APIs (Aztro, horoscope-app-api) and their static fallback were removed (§40). `astrology.service.js` does real western zodiac-sign calculation from date of birth; Vedic details (moon sign, ascendant) are still stubbed (`// TODO: Future enhancement - call Vedic astrology API`, line 57).

## 6. Known resolved issues (history only — don't redo these)

- **Seeder JSON bug** — fixed, committed (`bhav-bhakti-be` `15c2b0a`): a seeder crashed inserting plain strings into JSON-typed multilingual columns; fixed by wrapping values in `JSON.stringify({ en: ... })`.
- **AWS S3 → Firebase Storage migration** — committed (`bhav-bhakti-be` `67c303b`), confirmed working end-to-end 2026-07-18 (real upload → Feed → app playback). AWS package/script cleanup was *not* part of this — see §2.
- **Feed title/caption field-mismatch bug** — fixed 2026-07-18 (`bhav-bhakti-fe` `4e65b55`): several components (`RingtoneFeedCard`, `FeedCard`'s mantra render, `mantras.tsx`) read `feed.caption` (always null) instead of resolving the multilingual `feed.title` object, showing generic placeholders instead of real content. Fixed to resolve `feed.title[language] || feed.title.en`. `MantraCard.tsx` had the identical bug but is confirmed dead code (never imported anywhere). Open question, still undecided: should `caption` become a real short-blurb feature, or be removed from the schema? See §4.
- An original infrastructure audit and two 2026-07-19 reference documents (a Product Status Report `.xlsx` and a Navigation Map `.html`) exist only as founder-held files outside both repos — not in git, don't assume Claude Code can see them.

## 7. Session state — uncommitted local changes (resolved)

Resolved 2026-07-22: `package-lock.json`'s unexplained drift (byte-identical to `HEAD`) and `api.ts`'s hardcoded `10.0.2.2` override (properly fixed in §12). The founder uses HeidiSQL for direct database browsing — see §8 for when to use it vs. Claude Code.

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

Lock-screen/notification controls built and a related crash fixed — baseline since. The "zero error boundaries" finding from this session was resolved by §94's root-level error boundary. Deliberate, still-current scope decisions: `interruptionMode` stays `duckOthers` (audio ducks rather than pauses for calls); no deep-link-to-specific-screen from the notification; iOS entirely out of scope (no native `ios/` project). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 19. 2026-07-23 session (continued) — lock-screen confirmed on a real phone, WiFi issue narrowed, emulator regression root-caused (fixed next session, see §20)

WiFi dev-client connectivity issue narrowed (USB remained the workaround) and an emulator regression found — both fully resolved next session, see §20. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 20. 2026-07-24 session — isDevice fix confirmed, recurring WiFi IP-reassignment documented, an unidentified network error logged

`isDevice` fix confirmed working. The WiFi/IP-reassignment operational note was moved to §8 (still there). The "unidentified repeating Network request failed error" logged this session was most likely the same connection-pool contention bug later diagnosed and fixed in §25/§26, though never explicitly confirmed as the same issue. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 21. 2026-07-24 session (continued) — Audio hub restructure shipped, a real crash found and fixed

Audio hub restructure (Ringtones/Aartis/Bhajans sub-tabs) shipped, since superseded visually by the Audio hub UI overhaul (§60). Standing lesson from the crash fixed here, still applicable: any code that touches an `expo-audio` player instance during cleanup needs a defensive try/catch, since no synchronous "is released" check exists — this crash class recurred at least twice more (§24, §25) in different files. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 22. 2026-07-24 session (continued) — shared deity/trending filter shipped for Ringtones, three trending bugs found and fixed

Shared Deity/Trending filter pattern (`DeityFilterRow`, hub-level filter state, "Others" as a real Deity row) originated here for Ringtones, then reused unchanged for Wallpaper Hub (§23), Aarti/Bhajan (§27), and Mantra Explorer (§56) — this is the standing pattern for any future filterable content type. Three real `GET /feed/trending` bugs found and fixed this session (ignored `type` param, missing pagination, wrong-scope sort) — now baseline, superseded further by §41's window removal. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 23. 2026-07-24 session (continued) — Wallpaper Hub built end-to-end, mirroring the Audio hub pattern

Wallpaper Hub (Status/Thought/Wallpapers sub-tabs) built end-to-end — since had video support and the Viewing Window feature added (§33), then a full UI overhaul (§61). **Still not actioned:** `WallpaperFeedCard`'s `variant` prop (`default` vs `grid-tile`) was built as deliberately temporary scaffolding — founder's stated intent is to eventually unify to one card style everywhere; don't assume this has happened without checking. Real share-destination deep-linking (WhatsApp Status/Instagram Story) remains parked, not started. (Firebase Analytics, also parked here, has since shipped — §95.) Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

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

DONE, COMMITTED (`fb8b518`, `39e5fc9`), tested on-device, frontend-only. Home only (opt-in `enableViewportAutoplay`, `false` everywhere else): the card at least 60% visible autoplays, one at a time (200ms debounce, plus a 500ms floor between player starts because of connection-pool sensitivity, §25/§26). Routing covers any feed with media, so video needed no routing change. Cards measure themselves (the fixed `getItemLayout` was dropped for this path, which also fixed a blank-scroll pagination bug). `AutoplayFeedCard`: an isolated per-card player (no `playbackStore` — overlapping the persistent player is an accepted trade-off), a 30s-or-natural-length audio cap, looping video, a play/pause overlay, CTA pills (Listen / Set as Ringtone / Set as Wallpaper), a Like/Share/Views footer and a shared `formatCount`. Phase 5 (muted-by-default video) was built in the same commits (§31); Phase 6 (hardening) was never formally run. The temporary `isPremiumUser` paywall stub added here was consolidated in §42 and retired for Home's action button in §106 (Listen is always free). Full original detail archived.

## 31. 2026-08-01 session (continued) — Phase 5 confirmed already built, app-backgrounding autoplay bug fixed

Frontend-only. Phase 5 (muted-by-default video with a persisted unmute, `soundPreferenceStore`) turned out to be already built with Phase 4. Real bug fixed (`a21460b`): backgrounding the app didn't stop Home autoplay — fixed by folding an `AppState` listener into the existing `isEffectivelyActive` flag, so audio and video stop through the same code. A Reels-style snap-to-card Status feed was scoped here, then abandoned in §32/§33 in favor of the looping video grid. Full original detail archived.

## 32. 2026-08-02 session — Status sub-tab Reels-style feed: first attempt reverted, rebuild scoped

**Frontend-only, nothing committed.** A FlatList snap-scroll attempt was built then reverted (FlatList can't guarantee zero adjacent-item bleed, a real architectural limitation) and a `react-native-pager-view` rebuild was scoped as the next attempt — but abandoned, not pursued: §33's auto-looping video grid was the founder's actual chosen direction. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 33. 2026-08-03 session — Wallpaper Hub video support + Viewing Window feature shipped; pager-view rebuild abandoned

DONE, COMMITTED (`c691eda`, `65be4d7`), tested on-device, frontend-only. `WallpaperFeedCard`'s grid tiles play looping video, always muted (deliberately independent of `soundPreferenceStore`). New **Viewing Window**: tapping a tile opens a centered 80%×80% React Native `Modal` (not a bottom sheet) with sound, plus Like/Share/Download through a shared `useWallpaperActions` hook. Its premium gate is now the single `PREMIUM_GATING_ENABLED` mechanism (§106), not the stub it started with. Three real bugs fixed: a stale Like state (now derived live from the `feedId`), backgrounding not pausing video (an unconditional `AppState` subscription plus an explicit `pauseAsync()`), and download filename collisions with false success and leaked temp files — fixed in all three download call sites via a timestamped name and a shared `getMediaFileExtension` (a hardcoded `.jpg` had been corrupting downloaded videos). **The `react-native-pager-view` Reels-style Status feed was abandoned, not deferred** — the founder chose this looping grid instead. Full original detail archived.

## 34. 2026-08-04 session — Real content sharing built (react-native-share)

DONE, COMMITTED, tested on-device (wallpaper/video confirmed; audio branch built but untested, blocked on no thumbnail content, not a code gap) — frontend-only. Replaced React Native's built-in text-only `Share` with `react-native-share`, since it reliably combines a real file + caption in one action on Android. New shared `shareContent(feed)` utility handles downloading the real file with correct MIME type, thumbnail-only sharing for audio, timestamped filenames, an in-flight double-tap guard, and share-count incrementing. Also discarded the leftover pager-view scaffolding props (`fixedTotalHeight`/`showTypeLabel`/`showCtaPill`) from `AutoplayFeedCard.tsx` (the abandoned pager-view plan itself stays documented in §33). Deferred at the time: content-type-specific caption wording (since built, §116) and paywalling Share (since built as part of the Group 4 step-2 gate, §106 — currently switched off). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

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

Frontend-only. DONE, COMMITTED (`d791560`, `6b4681d`), TESTED ON-DEVICE. The date-navigation pill was removed from `horoscope-detail.tsx` (today-only MVP). The 12-sign grid paywall added here was later removed entirely — Rashifal is free for everyone (§69). Three separate, disagreeing `isPremiumUser` stubs were consolidated onto the existing `usePremiumStore`. What remains of that stub is §87's open item: real per-user premium status still needs the unbuilt Premium frontend (Firebase Auth, §45, and the backend subscription pipeline, §77–§79, are both done). Full original detail archived.

## 43. 2026-08-12 session (continued), resolved 2026-08-13 — Firebase Phone Auth Phases 1-4

Phases 1-4 DONE, COMMITTED: backend token verification with find-or-create plus session issuance; frontend `signInWithPhoneNumber`/`confirm`. Real phone numbers on sideloaded builds needed two findings: the Android API key's "Android apps" restriction broke Firebase's reCAPTCHA fallback (relaxed to "None", API restrictions kept), and Play Integrity is unavailable to sideloaded builds by Google's design. That reCAPTCHA-fallback era ended with real Play Store distribution — see §81. `google-services.json` was briefly committed; it's untracked now and deliberately left in git history (the same key ships in every APK). Full original diagnosis archived.

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

## 54. 2026-08-17 session — Language/i18n system migrated to react-i18next: ALL 5 PHASES DONE, COMMITTED, TESTED

Six overlapping hand-rolled translation mechanisms (plus hardcoded `language === 'hi' ? … : …` ternaries in 5 files) were replaced by react-i18next, with two namespaces — `translation` and `player`, kept apart because both old systems had a top-level `mantras` key of different shapes. `useI18nStore` stays the single source of truth for language selection; react-i18next only resolves strings, kept in sync via `i18n.changeLanguage()`. All 25 consumers migrated; dead mechanisms deleted; the locale JSON files were kept as resource data, unchanged. Gujarati/Bengali hidden from the picker (§9); a language toggle added to Home's header. Full audit and phased plan archived.

## 55. 2026-08-19 session — Horoscope English/Hindi content mismatch found and fixed

FOUND AND FIXED, COMMITTED, TESTED with real data. The daily horoscope generator made 24 fully independent Gemini calls (12 signs × 2 languages), so English/Hindi versions of the same sign were genuinely different content, not translations. Fixed via a two-step process: generate once in English, then a separate Gemini call translates that exact content into Hindi (`luckyNumber` copied directly, never re-generated, and retry-safe via always reading the English row back from the DB). Verified on real data. Old, already-mismatched rows were not retroactively cleaned up (acceptable — Rashifal is today-only, no history shown). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 56. 2026-08-19 session (continued) — Mantra Explorer redesign: ALL 4 PHASES BUILT, COMMITTED, TESTED ON-DEVICE

(1) The back button navigates explicitly to Home; the quiz promo was hidden (the quiz was later removed, §101). (2) The broken `categoryId` pill grid was removed — `category_id` was NULL on every feed, since the CSV only ever filled `deity_id` — and replaced by the shared `DeityFilterRow` pattern with a new `useMantraFeed` hook; "Trending" was renamed "All" app-wide. (3) The wallpaper-only `statusOccasion` field was widened into an 8-value `label` (later replaced by the many-to-many `tags` system, §104). (4) "मुझे चाहिए / I am looking for" mood tiles — tapping one plays a random matching mantra via `sortBy: random` on the feed endpoint (the tiles now filter with `tags=`, §103); mantra cards simplified with mood pills and a now-playing border; margins standardized to `spacing.lg`. Also concluded here: don't revive `categories` for mood tags (moot — the table was dropped, §104). Mantra list ordering (`Feed.order` is never populated) was scoped out as a separate task. Full 5-round investigation archived.

## 57. 2026-08-20 session — Aarti/Bhajan Player Redesign: ALL 6 PHASES DONE, COMMITTED, TESTED ON-DEVICE

ALL 6 PHASES DONE, COMMITTED, TESTED ON-DEVICE. `audio-player.tsx` restructured to a YT Music-style layout (thumbnail → title/artist → Like/Share/Views pills → seek bar → Shuffle/Previous/Play/Next/Repeat → swipe-up-to-open-Queue) with the bottom nav bar hidden immersively. Mantra's control branch deliberately left untouched (own redesign, §58). Two real bugs fixed along the way: title/artist was being silently overwritten by the CSV importer with a copy of the English title (fixed in the player, 3 nav call sites, 2 share-message builders, and the importer); `getLocalizedText()` claimed to check language but was hardcoded to English (fixed to genuinely read `useI18nStore`). Known limitation at the time: caption/artist was a single plain-text column — since resolved by the feeds redesign's bilingual `subtitle` (§102/§103). The "Up Next" Hindi-label truncation noticed here was a real bug, later root-caused and fixed by §71. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

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

Real dev/production package identity split shipped (`com.orivori.bhavbhakti` vs. `.dev`, a genuinely separate Android app with its own Firebase registration/keystore) plus a typed-confirmation, staged-rollout safety script (`npm run update:production`) in front of production EAS Update pushes. Both variants originally shared the production backend and database (see §75). Since `402ce89` (frontend `dev`, 2026-09-24) the `.dev` app's `development` variant uses the Railway dev backend (`api-dev.orivori.com`); the `preview` variant can still point at production (§96). A Play Console upload rejection (an old release locked to an unknown signing key) was diagnosed and a key reset requested — activated live in §80. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

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

**SCOPED, NOT YET BUILT** here (four items found while investigating login session behavior): (1) the 24h-frontend vs. 10-day-backend expiry mismatch and (2) dead 401-cleanup code in `apiClient.ts` — both picked up and shipped, see §87. (3) No re-auth check on backgrounding — partly addressed: the token's expiry date is now re-checked when the app returns from the background (§106/§107); resetting navigation to Home after a long background is still unbuilt. (4) `isNewUser` is now read (Firebase Analytics §95, Meta §109), but the "Welcome Back" text on `phone-login.tsx` is still hardcoded for everyone. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 84. 2026-09-09 session (continued) — Legal documents + account deletion: BUILT AND CONFIRMED WORKING

**BUILT AND CONFIRMED WORKING on `.dev`, tested end-to-end** — supersedes §82's "SCOPED, NOT YET BUILT" status. Shared `LegalDocumentViewer` (full-screen + bottom-sheet modes via `WebView`), wired into Profile's menu, the login screen's disclaimer links, a Support ID display (derived from `firebaseUid`), and the full account-deletion flow — all five originally-scoped pieces now live and tested on-device.

**Six real bugs found and fixed along the way** (Android WebView blank-render inside the animated bottom sheet; an overly loose domain guard; a header text-clipping `lineHeight` bug; a `BottomSheetView` fixed-height layout issue with no prior working precedent in this app; a WebView-vs-sheet gesture conflict; hardware-back-button navigation on both new screens) — each independently diagnosed with real evidence. Full bug-by-bug root-cause detail archived, see `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

**Shipped to production in `versionCode` 4 (§86).** Committed and pushed to `bhav-bhakti-fe`'s `master` (`5b504d3`); backend's `firebaseUid` exposure committed and pushed separately (`bhav-bhakti-be` `8c8a7c0`).

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

## 87. 2026-09-13 session — Session-expiry sync + contextual login prompt: DONE, live in production and merged to master (since generalized, §106/§107)

**Part 1:** the app reads the JWT's own `exp` claim (a small hand-written base64url decoder) instead of a hardcoded 24h, so its local check matches the backend's real 10-day expiry. `jwt.util.js` now preserves the real error type — expired or invalid token → 401, an unrelated server/database error → 500, never misreported as session expiry. **Part 2:** a "session expired, please log in again" prompt (one Zustand store, one modal at the app root, same pattern as the paywall) that returns the user to the screen they were on. It originally fired only for six opted-in action endpoints; since §106/§107 every 401 is handled once, centrally. The original product rule here — browsing needs no login, only actions do — was **superseded by §107**: every feed-serving endpoint now requires login (Group 4 step 5).

**Still open — HIGH PRIORITY for the next Premium session:** `isPremium` is permanently `false` for every user. `setSubscription()` is never called anywhere; the Premium frontend (wiring up `GET /subscription/status`, purchase UI) was never built, so a paying subscriber is indistinguishable from anyone else. `usePremiumStore`'s stub is now seeded from the `enablePremiumSubscriptionUI` feature flag.

## 88. 2026-09-11 session — Rashifal back-navigation fix: DONE, CONFIRMED WORKING, live in production and merged to master

Android's hardware back button and edge-swipe gesture on `horoscope-detail.tsx` now correctly respect entry point (Home's daily-horoscope card vs. the 12-sign grid vs. bottom-nav tab switch) instead of always falling through to Home — DONE, CONFIRMED WORKING, live in production and merged to master, using the same proven `BackHandler` + `useFocusEffect` pattern already established on `audio-player.tsx`. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 89. 2026-09-11 session (continued) — Auto-verification visible feedback: DONE, CONFIRMED WORKING, live in production and merged to master

A "✓ Verified automatically" banner + input lock now fires the moment Android's background SMS auto-verification (§81) completes, instead of silently waiting for manual typing to reach 6 digits — DONE, CONFIRMED WORKING, live in production and merged to master. A real false-positive bug (the banner firing on every normal manual login too, 100% on `.dev`) was found and fixed same session via an `isVerifyingRef` guard, confined entirely to `verify-otp.tsx`. Deliberately not built: validating typed digits against the real auto-retrieved code (would require migrating off `signInWithPhoneNumber`, too risky a change to an already twice-hardened auth path). Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 90. 2026-09-11 session (continued), updated 2026-09-14 — Rashifal variety: second fix applied

The first fix (real date interpolation) helped day-to-day repetition, but different signs then converged on identical lucky values on the same night. Root cause: no `temperature` set on the Gemini call, and no sign-specific signal for those fields. Fixed: `temperature: 1.4` (English generation only, not the Hindi translation); anchoring example values and two instructions a stateless call can't honor were removed. `Bhav_Bhakti_Handoff.md` treats this as fixed; since temperature is probabilistic, within-sign and cross-sign variety are still worth watching.

## 91. 2026-09-11 session (continued) — NEXT SESSION reminder: pick up the deferred §87 session/auth work — RESOLVED, see updated §87

**RESOLVED 2026-09-13 session — picked up and completed, see §87's updated entry (now "Session-expiry sync + contextual login prompt") for the full shipped result.** The "require login for everything" question originally flagged here as blocking was resolved narrowly rather than needing the all-or-nothing decision this reminder anticipated: browsing stays login-free, only the app's 6 real action endpoints (like/unlike, download, Liked filter, profile load/save) gate on a valid session.

## 92. 2026-09-12 session — Jio network blocking Railway backend: DIAGNOSED AND FIXED

Jio network blocking Railway backend — DIAGNOSED AND FIXED, confirmed on real devices, live in production/master. Real users on Jio couldn't load any app content (a known pattern of Indian ISPs blocking shared PaaS domains like `.up.railway.app`). Fixed via a custom domain (`api.orivori.com`) with an automatic Railway fallback built in. Lesson: use a custom domain for production backends, since shared PaaS domains can be silently ISP-blocked in ways invisible to normal testing. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 93. 2026-09-13 session (continued) — Observability gaps: SCOPED here, all three tasks shipped in §94

**SCOPED here** (prompted by a real question about incident debugging/telemetry): confirmed `NODE_ENV` was leaking raw internal errors on Railway (fixed same session); found a genuine mismatch between the Privacy Policy's crash-reporting promise and zero actual crash reporting anywhere in the app. Three tasks scoped, in priority order — Firebase Crashlytics with Support ID linking, a backend uncaught-exception/unhandled-rejection handler, a root-level frontend error boundary — **all three built and confirmed working, see §94.** SLO dashboards/Grafana/APM explicitly declined as premature for current scale. Full original detail archived in `CLAUDE_ARCHIVE_2026-07-29_full-history.md`.

## 94. 2026-09-15 session — Observability trio: DONE, CONFIRMED WORKING

**DONE, CONFIRMED WORKING.** Crashlytics (with Support ID linking via `setUserIdentifier()`), the backend uncaught-exception handler, and the frontend error boundary — all three tasks scoped in §93 — are now built and tested on `.dev`: a real triggered crash was confirmed appearing in Firebase Console with the correct user identifier attached. Cherry-picked to `production` (`versionCode` 5, submitted to Play Console). Firebase Analytics native module also installed alongside (no `logEvent()` calls yet — deliberately deferred).

Two reference documents created for future sessions: `Bhav_Bhakti_Push_Notifications_Plan.md` (fully scoped, not yet built — needs a native rebuild) and `Bhav_Bhakti_Analytics_Event_Plan.md` (the five-bucket event strategy — Acquisition/Activation/Engagement/Conversion/Retention — not yet implemented).

Both follow-ups named here (push notifications, the analytics `logEvent()` calls) shipped in §95.

## 95. 2026-09-18 session — Push notifications shipped to production; Analytics 4-of-5 buckets shipped to production

**Push notifications — DONE, CONFIRMED WORKING, live in production and merged to master.** Native install, permission requested right after login (covers both new and existing users via `isAuthenticated`), single all-users topic subscription, custom notification icon (own hand-written config plugin, not `expo-notifications` — avoided a real manifest-merger conflict with `react-native-firebase/messaging` via a `firebase.json` fix), and a first-ever deep-link handler with a validated route allowlist (fixing a real bug where an invalid route opened Expo Router's generic error screen instead of falling back to Home). Foreground notification display deliberately deferred (needs Notifee or similar, real future work post-MVP). Zero custom backend — Firebase Console's own composer/recurring campaigns handle all sending.

**Firebase Analytics — PARTIALLY DONE.** Built and confirmed working (live DebugView testing) across all five funnel buckets: Activation, Engagement, Conversion, Retention, and Acquisition (deliberately deferred, covered by Play Console already). Still remaining: refining event precision once real usage data comes in (e.g., `login_failed`'s raw error codes, `card_rank` position-tracking — deferred, needs real plumbing work), and the still-unbuilt Premium pipeline frontend blocks several Conversion events (`trial_started`, `trial_converted_to_paid`, `subscription_cancelled`) from being real yet — only `paywall_hit` and `upgrade_cta_clicked` are genuinely live today.

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

The quiz never produced recommendations and its only entry point had been hidden since §56, so it was removed outright. **Backend:** routes, controller, service, the 4 models, seeder and the original create-table migrations deleted; migration `20260925000001-drop-mantra-quiz-tables.js` dropped `quizzes`, `quiz_questions`, `quiz_options` and `quiz_responses` in **both** the dev and production databases (run manually — Railway deploys never run migrations; `quiz_responses` had 0 rows in both). **Frontend:** `mantra-quiz.tsx`, `src/features/quiz/`, its route registration, the `QUIZ` API endpoints and the hidden promo card deleted. The original content (1 quiz, 5 questions, 29 options incl. `tags`) is backed up at `bhav-bhakti-be/archive/mantra-quiz-content-backup-2026-09-25.json`. Shipped: backend `main` (merge `1cf22a4`); frontend `dev`/`production`/`master` (all at `c9ec390`), published via `npm run update:production` and confirmed working live.

## 102. 2026-09-26 session — Feeds schema redesign Phases 1–3 built on dev (superseded by §104)

Built on `develop`/`dev` and migrated on the dev database (backend `aa94797`, `8b259dc`, `536b9cc`; frontend `5a13359`); promoted to production in §104. Standing reference: **`D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Feeds_Schema_Redesign_Plan.md` is the source of truth for anything touching feeds, tags or the CSV importer.** Dev migrations are run with the dev-scoped Railway token (`railway run --service MySQL`), never via `.env`. Full original text archived.

## 103. 2026-09-26 session (continued) — Feeds schema redesign Phases 2–3 finished on dev, `label` retired (superseded by §104)

The app switched to reading the new fields directly (`tags`, bilingual `subtitle`, `url`, `mediaType`, thumbnails, `duration`; helpers in `src/utils/feedFields.ts`, `052761c`). New `excludeTagGroup` filter on `GET /feed`, `/feed/trending` and `/feed/user/liked` (`6634b8c`); the Wallpapers tab uses `excludeTagGroup=occasion` (`9573ce8`). `label` was dropped (`f158805`, migration `20260926000006-drop-feeds-label`); a request still sending `label` gets a **400** by design, since silently ignoring `label=none` would widen an old build's Wallpapers tab. All of this reached production in §104. Still open from this session (Handoff items 10–11): a downloaded wallpaper appears in the gallery but won't open; the hardware back button minimizes the app after opening the player (fixed in §115). Full original text archived.

## 104. 2026-09-26 session (continued) — Feeds schema redesign: FULLY COMPLETE, live in production

**DONE, live in production as of 2026-09-26 — dev build-out through production promotion.** Supersedes the "NOT in production" status in §102/§103. Backend `main` at merge `24091f6`; frontend `production`/`master` at `0e0c9a7`. **Full record: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Feeds_Schema_Redesign_Plan.md` (Part 9)** — this is a pointer/summary.

Production now runs: `categories` retired; single-value `label` replaced by a many-to-many `tags`/`feed_tags` system (filter with `tags=` / `excludeTagGroup=`; a `label` param now returns 400); `feed_media` merged into `feeds` (storage paths, bilingual `subtitle`); and the `media[]`/`caption`/`label` compatibility shims retired — feed responses carry only the new fields.

The promotion went out in five staged releases: (A) prep — the feed log-flooding fix and `bhav-bhakti-be/scripts/migrate-production.js` (production-only, typed `PRODUCTION` confirmation, mandatory `--to`); (B) backend release 1 plus migrations 000001–000005 (categories, tags, media merge); (C) the app OTA update; (D) the adoption wait — waived by founder decision; (E) backend release 2 plus migration 000006 (label drop) and shim retirement. One ~10-minute outage in total (Stage B, between deploy and migrations). Full database backups were taken before each migration stage; production-specific JSON backups are in `bhav-bhakti-be/archive/production-*-2026-09-26.json`.

The one follow-up noted here — a `versionCode` 7 Play Store build, so a brand-new install no longer briefly runs pre-redesign code — shipped with the Meta SDK (§109).

## 105. 2026-09-26 session (continued) — Feeds schema redesign production promotion: verified complete against git

Re-verified 2026-09-27 against git, not just the plan document: stage A (log-flooding fix `abd36bf`, production migration runner `3a0d403`), B (backend `main` merge `eaf47e1` + migrations 000001–000005), C (frontend `production` cherry-picks `435e2d4`/`2d9f1bd`/`0e0c9a7`, `master` fast-forwarded), D (the adoption wait, waived by the founder), E (backend `main` merge `24091f6` + migration 000006). The branch-state and `versionCode` 7 notes that were here are superseded by §107–§109.

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

Live-verified against `api.orivori.com` with no login: `GET /feed`, `/feed/trending`, `/feed/trending/mantras`, `/feed/tags/popular` and `/feed/:id` return **401**; `/deities` and `/health` still 200. Rechecked in code 2026-09-29: every feed-returning route in `src/routes/feed.routes.js` has `authenticate`; only the `view`/`play` counters are open, and they return only `{ success: true }`; `admin-feed.routes.js` isn't mounted; no categories routes exist.

**Still open:** `PREMIUM_GATING_ENABLED` on production needs a manual re-confirmation (Railway dashboard → backend service → Variables) — this session's CLI only had development access. **Group 4 now stands at 8 of 10** (with step 8, §108): only step 7 (App Check) and step 10 (lock `storage.rules`, gated on 7 and on rotating the existing permanent download tokens) remain. *(Update: step 10 done, step 7 skipped and token rotation dropped by founder decision, 9 of 10 — §112.)*

## 108. 2026-09-28 session — Security audit Group 4 step 8 (signed URLs for media): DONE, live in production

**Full detail in `Bhav_Bhakti_Security_Audit_Plan.md`** — this is a pointer/summary. Backend-only; no frontend change. Built on `develop` (`17b7c50`), merged to `main` (`5f2942e`), deployed to production (Railway deploy `b1b1ae72`) on 2026-09-28, confirmed working via an on-device production check.

Every feed response now returns V4 signed Cloud Storage URLs (`storage.googleapis.com/...?X-Goog-Signature=...`) for `url`/`thumbnailSquareUrl`/`thumbnailPortraitUrl`, expiring after **72 hours** (`SIGNED_URL_TTL_MS` in `src/utils/feedMedia.util.js`; `version: 'v4'` explicit — the library defaults to V2, which has no expiry ceiling). `applyMediaFields`/`serializeFeed` are now async; all 5 call sites in `feed.service.js` await them, guarded by `feed.service.serialize.test.js`.

**Shipped in a different shape than planned:** the plan had URLs minted at a delivery endpoint; they're actually minted at feed-listing time (every feed response), since autoplay needs a playable URL in the feed itself.

**Not done, still open:** the ~208 existing permanent Firebase download tokens were **not rotated** — old tokened links (and, until step 10 locks `storage.rules`, old token-free links) still work, so signing alone isn't access control yet. Steps 7 (App Check) and 10 (lock `storage.rules`) not started — with step 5 live (§107), Group 4 stands at 8 of 10. *(Update 2026-09-30, §112: step 10 done, so bare links now fail; tokens accepted as-is, no rotation; step 7 skipped — founder decisions.)*

**Known side effect:** images (thumbnails/wallpapers, plain RN `Image`, cached by URL) re-download more often, since the signed URL changes on every fetch. Audio/video caching is unaffected (keyed by feed ID/title, not URL).

## 109. 2026-09-29 session — Meta (Facebook/Instagram) Ads SDK: DONE, live in production

**Full plan, decisions and build log: `D:\bhav_bhakti_Claude_docs\Bhav_Bhakti_Meta_SDK_Plan.md`** — this is a completion record only. Frontend-only; no backend involvement.

- **`react-native-fbsdk-next`** (Facebook Android SDK 18.x), configured in `app.config.js` for the production package (`com.orivori.bhavbhakti`) **only**. The `.dev` package gets no Meta config, and `src/utils/analytics/metaEvents.ts` no-ops there, so the code is inert in `.dev` builds.
- **Events, all client-side, no parameters (no PII):** automatic install/app-open (logged by the SDK itself); a custom `login_success` on every login; and Meta's standard `CompleteRegistration` (`fb_mobile_complete_registration`, written out as a literal — never read from the native module) only when the backend's `isNewUser` is true. Both login events fire from `useAuth.tsx`, next to the Firebase `login_completed` event.
- **Verified** on a real Play Store install of `versionCode` 7 (Closed Testing): app-open and `login_success` confirmed in Meta Events Manager → Test Events. The Play App Signing key hash is registered with Meta; the temporary debug key hash (Meta) and debug SHA-1 (Firebase) have been removed.
- **Branches:** `feature/meta-sdk` was branched off `production` — a one-time exception to §85, per the plan doc's decision #10. `production` was fast-forwarded to it (`e5dd207`); its two code commits were cherry-picked into `dev` (`4f6e87b`, `1e2878f`; the versionCode bump deliberately not, since `dev` keeps its own); `master` was fast-forwarded to `production`. All pushed.
- **Done since:** Play Console's Data Safety form and Advertising ID declaration (the SDK adds the `AD_ID` permission) — see the header. Deferred to later phases: deferred deep linking, a Purchase event, Advanced Matching.

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
- **Backend:** `npm audit fix` (`main` merge `7c80569`; `firebase-admin` 14.5 moves `@google-cloud/storage` to 8.2, which needs **Node ≥ 22**), `sharp` 0.35.5 (`ef3096c`), unused `aws-sdk`/`@aws-sdk/client-s3`/`multer-s3` removed (`613c4a3`). 2 moderate findings remain (`sequelize`'s bundled `uuid`, not reachable as used).
- **Frontend:** JS-only packages updated by name, incl. `axios` 1.20.0 and `shell-quote` (`dev` `f1e992a` → `production` `11f2056`, shipped by OTA). 24 findings remain (the Expo chain, never-imported Firestore's `grpc-js`, build-time `image-size`).
- **Expo SDK 54→57 deliberately parked** as its own project: `expo-av` is gone in SDK 55 (6 video files → `expo-video`), the 266-line `expo-audio` native patch needs re-porting, every native module needs compatible versions, and it needs a Play Store build.
- **`bhav-bhakti-fe/.npmrc`'s `force=true` removed** (`legacy-peer-deps=true` stays; `dev` `baa64cf` → `production` `0d9270e`). It made every npm command act like `--force`, so a plain `npm audit fix` would have jumped to SDK 57. The lockfile came out byte-identical — nothing shipped changed. **Before any frontend OTA, diff the lockfile for native packages.**
- **Testing admin-only upload routes on dev:** temporarily set dev user 30 (founder's test account) to `role = 'admin'` via a script that refuses unless `.env` points at dev; mint a 10-minute JWT inside `railway run -s bhav-bhakti-be -e development` so `JWT_SECRET` is never printed; call `/upload/media` and `/upload/optimized-image` on `api-dev`; delete the uploads; restore `role = 'user'`. Check deploys with `railway deployment list -s bhav-bhakti-be -e development|production` (production via `RAILWAY_TOKEN_PROD`).
- Noted, not changed: `GET /upload/config` is public (limits and types only). The nightly backup service (auto-deploy off) keeps its pre-Group-7 image until redeployed by hand — nothing requires that.

Full detail archived.

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

**Not in scope, still open (Immediate Plan doc):** a `versionName` scheme (next native build), force-update / "update available" (nearer the Premium launch), deep linking (its own session).

## 118. 2026-10-05 session — Co-founder feedback pass: deity names, content-only chips, Status share pill, ringtone save flow: live in production

Backend `develop` `606fa9b`, `914b177` → `main` `e4ad3ce`. Frontend `dev` `c3d50ea` → `production` `c33cad8`; `fcbab4f`, `9ff5f22` → `6e17767`, `c9b4581`; `16d4ee6` → `f6c16ba`. `master` = `production` = `f6c16ba`.
- **Deity names:** devotional display names (Shiv Ji, Maa Lakshmi, Khatu Shyam Ji…) set by `scripts/update-deity-display-names.js` (dry run by default; `--target production` asks for PRODUCTION and backs up `deities` to `archive/` first). Only `deities.display_name` changed. **Never change `deities.name`** — ranking weights and campaigns, analytics, the chip order and the CSV script key on it. **Don't run `create-deities-from-csv.js`** — it would overwrite the names.
- **Chips:** `GET /deities?hasContent=true` (5-minute server cache; the app falls back to the full list) — chips show only deities with active content, at most 8 in the row, "More" only beyond that. Chip labels and Aarti/Bhajan/Ringtone titles wrap to two lines; chip strings translated (`deityFilter.*`).
- **Home wallpaper cards:** labelled "Status"; the wallpaper and thought pill is "Set as Status" and calls `shareContent()`; "See all" opens the Status sub-tab; the set-as-wallpaper code and strings removed.
- **Sound settings:** new `src/utils/openSoundSettings.ts` (`expo-intent-launcher`) — both ringtone cards open Android's Sound settings.
- **Ringtone save (Android only):** new `src/utils/saveRingtoneToDevice.ts` saves into a media-library album named exactly "Ringtones" (`Music/Ringtones/`, which Android flags as a ringtone) as `Bhav Bhakti - <English title>.mp3`, with an ASCII-name retry, a duplicate check before the premium gate and one translated alert.
- **Still open:** Home ordering diversity; a search alias (laxmi → Maa Lakshmi); cancelled shares counted as shares; the audio pill's Hindi line height (§71); the English-only Status share caption; 3 production ringtones with Hindi embedded title tags (content team).

Full detail in the commit messages.

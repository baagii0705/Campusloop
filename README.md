# sol1o — Оюутны амьдралын талбай

Production: https://sol1o.me
Cloudflare Pages: `campusloop` (`campusloop-30j.pages.dev`)
Source of truth: `main` in `baagii0705/Campusloop`.

The same Mongolian student marketplace runs on the web and in the Capacitor iOS/Android wrapper. Appwrite provides accounts, listings, Wanted, Community and files. The existing Cloudflare D1 binding `SPONSOR_DB` stores sponsor applications, student deals, clubs and events. Chat is no longer part of the product.

## Development

Use Node.js 24 for local preview and the complete SQLite integration suite. The production build also supports Node.js 20+.

```bash
npm ci
npm test
npm run build
npm run dev
```

`npm run dev` serves the generated `dist/`, uses an in-memory SQLite database for the D1 APIs, and forwards existing public listing reads to production. It never writes new offers, clubs or events to production. `/?demo=1#societies` adds clearly marked sample clubs/events to that local database for browser QA. These samples are not bundled into the website or deployed database.

## Main files

| File | Purpose |
| --- | --- |
| `index.html` | Marketplace, accounts, Wanted and Community UI/logic |
| `board.css` | Shared base, forms, supporting screens and marketplace identity |
| `usability.js` | Shared feature menu, creation chooser, help and listing action forms |
| `feature-loader.js` | On-demand school, club/event and sponsor management screens |
| `campus-hub.js`, `campus-hub.css` | Unified school board and student deals |
| `societies.js`, `societies.css` | Club directory, event agenda, bookmarks, submissions and moderation |
| `societies-data.js`, `event-calendar.js` | Server-side validation, public queries and calendar serialization |
| `functions/api/` | Cloudflare Pages API handlers |
| `migrations/` | Additive D1 schemas; apply before deploying handlers that use new tables |
| `scripts/build-mobile.mjs` | Minified, hashed web build and offline shell |
| `scripts/appwrite-browser.mjs` | Only the pinned Appwrite SDK services used by this app |
| `tests/` | Regression, authorization, SQL integration and build checks |
| `sw.js`, `manifest.webmanifest`, `solio-icon.svg` | PWA installation and public shell caching |
| `capacitor.config.json`, `README-MOBILE.md` | Native wrapper and build instructions |

Cloudflare build command: `npm run build`; output: `dist`. The GitHub integration publishes changes to `main`. The build bundles Appwrite locally, preserves its BSD license, minifies JS/CSS, and uses immutable content-hashed asset URLs. Inline-handler function names remain stable. Secondary screens and upload helpers are loaded on demand. The service worker caches public static assets and never intercepts account/API responses.

## Clubs, events and student deals

Apply `migrations/001-student-deals.sql` and `migrations/002-clubs-events.sql` to the existing D1 binding. They preserve all sponsor tables and Appwrite data.

Signed-in users submit clubs or independent events. A club-linked event must belong to the verified club owner (or an admin), and the club must already be published. Submissions stay pending until an Appwrite admin-label account approves them. Owners can withdraw a club or cancel an event in «Миний хүсэлтүүд»; admins can reject, publish or close them. Closing a club also hides its linked events from public reads. Private owner IDs/review notes are excluded from public feeds. New club/event submissions have a per-owner daily limit.

Event dates are stored as UTC and displayed in Ulaanbaatar time. Only public events have downloadable calendars. Bookmarks are device-local, not server subscriptions or attendance confirmations. External registration/join links open the organizer’s own page; this site does not process event payments.

Student deal and sponsor applications have independent approval workflows. See [SPONSORED-ADS-SETUP.md](SPONSORED-ADS-SETUP.md) for advertising setup and prices.

## Image loading

`image-upload.mjs` resizes large JPEG/PNG uploads to at most 1600 pixels before uploading, retaining originals if conversion fails. Offscreen listing images wait until they approach the viewport. Five verified existing 960-pixel WebP variants are used for cards; detail views still use original files. A missing variant falls back to the stored original. No paid image transformation service is required.

## Repository cleanup

The old `ui.css` has been consolidated into `board.css`, with unused legacy catalog/advertising selectors removed. Dead chat insertion branches and the unreachable Smart Match screen are removed. The build no longer publishes duplicate unhashed JS/CSS copies.

Keep the API handlers, migrations, tests, build/preview scripts, Capacitor config and both workflows. `node_modules/`, `dist/`, native generated projects, credentials and logs stay out of Git. Files that are used only for development or mobile builds are still necessary source files.

## Navigation and usability

Mobile navigation has five entry points: Home, Search, Add, All features and My account. All features exposes every student and business destination with a short explanation. Add opens a chooser for listings, Wanted requests, posts, events and clubs. Authentication resumes only the requested UI after a successful login; closing the dialog cancels that intent and never submits content automatically.

Listing details retain the underlying search or feature page. Offers, reports and owner status changes use labelled Mongolian forms. Public search states when its results cover only the loaded listing pages and passes the query to Wanted, Community or clubs/events on request. Feature bundles remain lazy loaded.

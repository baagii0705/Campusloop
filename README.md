# Solio — Оюутны онлайн зах

**Production site:** https://sol1o.me  
**Cloudflare Pages project:** `campusloop` (`campusloop-30j.pages.dev`)  
**Source of truth:** `main` branch in `baagii0705/Campusloop`

Solio is a Mongolian student marketplace, with school-based listings, Wanted requests, Community, profiles, chat and saved listings. The website uses **Appwrite** for user accounts and data. The same web code is packaged for iOS and Android with Capacitor.

## Main files

| Path | Purpose |
| --- | --- |
| `index.html` | Production UI, styles and client-side application logic |
| `sw.js` | PWA service worker for offline shell/fallback |
| `manifest.webmanifest` | PWA name, theme and installation metadata |
| `solio-icon.svg` | PWA icon |
| `package.json` | Build, test and native app commands |
| `scripts/build-mobile.mjs` | Copies production web assets into generated `dist/` folder |
| `tests/solio-smoke.test.mjs` | **Single** regression suite for navigation, listings, modals, PWA and HTML |
| `capacitor.config.json` | iOS/Android Capacitor application configuration |
| `README-MOBILE.md` | Instructions for generating and testing native mobile projects |
| `.github/workflows/solio-smoke.yml` | Automatic tests and build on PRs/main |
| `.github/workflows/android-debug.yml` | Manually triggered Android debug APK build |

`node_modules/`, `dist/`, `android/` and `ios/` are **generated locally** and intentionally not committed. Don't delete source files solely because these folders aren't in Git.

## Development

Requires Node.js 20+.

```bash
npm install
npm test
npm run build
```

`npm run build` executes the regression tests and builds `dist/` for Cloudflare Pages. The build extracts inline CSS and JavaScript into content-hashed assets with immutable caching, and versions the offline shell with their hashes. The Cloudflare Pages settings should use **build command** `npm run build` and **output directory** `dist`. Changes to `main` deploy automatically via the GitHub integration.

Before merging a PR, check GitHub Actions and the Cloudflare preview. After merging, confirm the production deployment and check that `sol1o.me` actually serves the new markup. If not, check the Cloudflare cache and the PWA service worker before assuming deployment succeeded.

## Mobile application

See [README-MOBILE.md](README-MOBILE.md). The Capacitor wrapper uses the **same** web app and Appwrite backend; there is no independent native-site source to maintain.

## Keep the repository clean

- Keep useful tests in **one test suite** under `tests/`; add new regression checks there.
- Don't commit `dist/`, `node_modules/`, generated Android/iOS projects, logs, or local environment/secrets.
- Keep `index.html`, the service worker, manifest, icon, mobile build script and Capacitor configuration because they are used for production or native app builds.
- Remove files only after verifying that no build command, import, workflow or documented process depends on them.

## Image loading

Large JPEG/PNG uploads are resized locally to at most 1600 pixels and compressed before upload by `image-upload.mjs`; small images and animated formats are retained. Failed conversions fall back to the selected original. The first visible row loads immediately; remaining card images wait until they are within 180 pixels of the viewport.

Five existing large public photos have verified 960-pixel WebP copies in the same Appwrite bucket, using `<original-file-id>_card`. `solioCardImageUrl` selects these copies for cards and gallery thumbnails. The stored listing URLs, original files and owner permissions are unchanged; opening a listing still uses the original image. Removing a card copy safely falls back to the original. No paid image transformation service is used.

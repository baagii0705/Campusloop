# Solio Android + iOS (Capacitor)

This mobile wrapper packages the **existing** Solio `index.html` and its PWA assets into native WebViews. It keeps the current Supabase project, listings, chat, profiles, school marketplace, Wanted and community features. It does not create a second backend.

## Requirements
- Node.js 20+, npm
- Android: Android Studio + Android SDK + JDK 17
- iOS: macOS, Xcode, CocoaPods (as required by your Xcode setup), and Apple signing for device distribution

## Setup
```bash
npm install
npm run cap:add:android
npm run cap:add:ios   # only on macOS
npm run cap:sync
```

Android: `npm run cap:open:android` and build/run from Android Studio.

On macOS: `npm run cap:open:ios` and build/run from Xcode. Set a unique signing team and bundle identifier before release.

After changing `index.html`: run `npm run cap:sync` again. The `build` script copies current site files to `dist/` (no second version of the site). The generated native `android/` and `ios/` directories are excluded from Git and must be created on the development machine.

## Important checks before release
1. Test login/signup, Supabase authentication persistence, chat, images, listings, file upload and links on **both physical platforms**. Supabase email confirmation/password-reset redirect URLs must include the mobile scheme if deep-link auth is required.
2. Review Capacitor WebView origin, Supabase allowed redirect URLs, and native network permissions; do not put service-role keys in the app.
3. Create real PNG launcher icons and splash assets for Android and iOS; the included SVG is a PWA icon, not a production native icon set.
4. Build a signed AAB for Play Store, and a signed iOS archive for App Store Connect. Apple Developer Program and Google Play Console registration may be required.
5. App Store review may require native-app value beyond a simple website wrapper.

No APK/IPA or store submission is produced merely by committing this scaffold.

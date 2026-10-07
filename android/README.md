# Lyvra for Android

The Android phone/tablet build of Lyvra. It runs the same web bundle as the webOS TV app
(`app/src/main/assets/www/app.js`, unchanged from `com.hazem.lyvra_1.0.0_all.ipk`) in a
full-screen WebView, so features and look stay identical across platforms.

`assets/www/android.js` adapts the TV build to a touchscreen:

| TV remote            | Phone                                              |
|----------------------|----------------------------------------------------|
| Pointer click / OK   | Tap                                                |
| Wheel / Up-Down      | Swipe up/down (flick to move faster)               |
| Left / Right         | Swipe left/right                                   |
| Back                 | Android back gesture / button                      |
| Red (Favorite)       | Long-press an item, or tap the red hint            |
| Green/Yellow/Blue    | Tap the coloured hint at the bottom of the screen  |

The 1920x1080 stage is scaled to fit the screen in landscape.

## Updating the app from a new webOS build

Copy `app.js` and the `.woff2` fonts from the new `.ipk`
(`data.tar.gz` → `usr/palm/applications/com.hazem.lyvra/`) into `app/src/main/assets/www/`.
Keep this folder's `index.html` and `android.js`. Bump `versionName` in `app/build.gradle.kts`.

## Building

GitHub Actions (`.github/workflows/android.yml`) builds on every push that touches `android/`:

- `lyvra-debug-apk`: installable test APK, always built.
- `lyvra-release`: signed release APK + AAB (the AAB is what Google Play takes), built when
  these repository secrets are set:

  | Secret                    | Value                                     |
  |---------------------------|-------------------------------------------|
  | `LYVRA_KEYSTORE_BASE64`   | `base64 -w0 lyvra.jks`                    |
  | `LYVRA_KEYSTORE_PASSWORD` | keystore password                         |
  | `LYVRA_KEY_ALIAS`         | key alias, e.g. `lyvra`                   |
  | `LYVRA_KEY_PASSWORD`      | key password                              |

  Create the keystore once and keep it backed up (losing it means you can't update the app
  unless you use Play App Signing):

  ```sh
  keytool -genkeypair -v -keystore lyvra.jks -alias lyvra -keyalg RSA -keysize 4096 -validity 10000
  ```

`versionCode` is the workflow run number, so every CI build can be uploaded to Play.

Locally: open `android/` in Android Studio, or run `./gradlew assembleDebug`.

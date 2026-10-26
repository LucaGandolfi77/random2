# Mobile checklist

Ninth Day ships portrait-first on Android, then iOS. This is the device checklist for the current vertical slice.

## Project settings

| Setting | Value | Why |
|---|---|---|
| `display/window/size/viewport_width` | `540` | Design space; scales to 1080 × 1920 and taller devices |
| `display/window/size/viewport_height` | `960` | 9:16 base, `expand` fills taller screens |
| `display/window/handheld/orientation` | `1` (portrait) | Locked portrait |
| `display/window/stretch/mode` | `canvas_items` | UI scales cleanly across densities |
| `display/window/stretch/aspect` | `expand` | Tall phones get more vertical room, not bars |
| `input_devices/pointing/emulate_touch_from_mouse` | `true` | Desktop and editor testing parity |
| Renderer | Mobile | Battery and thermal headroom |

## Safe area

`Ui.apply_safe_area()` converts `DisplayServer.get_display_safe_area()` into design-space insets and is used by every screen and by the battle view. On desktop it falls back to the base margins.

Verify on:

- a notched iPhone (portrait, gesture bar);
- a punch-hole Android phone;
- a tall 20:9 Android device;
- a tablet in portrait (content should stay readable, not stretch edge to edge).

## Touch targets

Every interactive control is at least **48 design units** high. At the 540 × 960 design size this is 96 physical pixels on a 1080-wide screen.

| Control | Height |
|---|---|
| Primary title / continue | 64–76 |
| Phase cards | 66 |
| Story choices | 50 |
| Story continue | 54 |
| Battle actions / guard | 54 |
| Echo cards | 54 |
| Preview confirm / cancel | 50 |
| Enemy target rows | 50–62 |
| Bell Rest cards | 132 |
| Bell Rest confirm / skip | 48–54 |

## Save behaviour to test

1. Start Morning, quit on the story screen, relaunch: **Continue** returns to the Bell Map.
2. Start a battle, quit mid-turn, relaunch: **Continue** resumes the battle at the last player decision.
3. Win a battle, quit on the victory screen, relaunch: **Continue** goes to Bell Rest.
4. Quit at Bell Rest, relaunch: **Continue** goes back to the same Bell Rest.
5. Finish Day 1, relaunch: title shows **Day 1 · complete**.

## Android export

A debug APK is built by `tools/export_android.sh` using the checked-in preset. CI only runs headless tests; it does not upload APKs.

Verified locally:

- package `com.ninthday.game`, version `0.1.0`;
- min SDK 24, target SDK 36;
- `arm64-v8a` plus `x86_64` in the debug build, so it can target emulators;
- prebuilt Android template (no Gradle build);
- APK Signature Scheme v2 verified;
- output size ~55 MB debug, ~28 MB arm64-only;
- launch on a physical device still needs to be checked. The Android emulator in this container could not complete an APK install (it dropped offline during `pm install`), so device validation remains open.

Before exporting:

1. Install Godot **4.7.2** export templates.
2. Install Android SDK command-line tools, platform 35+, build-tools, and a JDK supported by the Godot version.
3. In Godot, set **Editor → Editor Settings → Export → Android → Android SDK Path**.
4. Create an Android preset:
   - Package name: `com.ninthday.game` (replace before store submission).
   - Min SDK: 24.
   - Target SDK: current Play requirement.
   - Architecture: `arm64-v8a` for release, add `armeabi-v7a` only if needed.
   - Version code/name from the release checklist.
   - Permissions: none required for the offline slice. Add `INTERNET` only when cloud/shop layers land.
5. Export a debug APK and run the save/safe-area checks above on device.
6. Export an AAB with a release keystore for internal testing. Never commit the keystore.

```bash
# Once export templates and the Android SDK are installed:
ANDROID_HOME=/path/to/android-sdk \
JAVA_HOME=/path/to/jdk-17 \
GODOT_BIN=/path/to/godot \
./ninth-day/tools/export_android.sh
```

## iOS export

iOS export requires macOS with Xcode. The project is portrait-only and has no platform-specific plugins yet. Check:

- safe area on notched devices;
- text scaling at 80–140%;
- reduced-motion setting;
- no reliance on mouse hover;
- App Store privacy declarations (offline build collects nothing).

## Accessibility pass for the slice

- Text sizes are design-space 11–24; the final build needs a text-scale setting.
- Color is never the only signal: enemies show tone names, statuses show words, Echo cards show `[stolen]` / `[unechoable]`.
- Enemy intents are text, not icons only.
- Every action is a tap; no swipes, timing, or gyro.
- The log exposes the combat math for players who want it.

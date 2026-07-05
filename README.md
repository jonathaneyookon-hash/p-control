# P-Control

A mobile switcher/controller UI for vMix and OBS, wrapped as a native Android app.

## What's in this repo

- `src/` — the React UI (the switcher screen you approved)
- `capacitor.config.json` — turns the web app into a native Android shell
- `.github/workflows/build-android.yml` — builds a downloadable APK automatically on every push
- `android/` — **not included yet**, gets generated the first time the workflow runs (or the first time you run `npx cap add android` yourself)

## How the landscape lock works

Real Android apps force orientation at the OS level, not with JavaScript. The GitHub Actions
workflow automatically inserts this line into `android/app/src/main/AndroidManifest.xml`:

```xml
android:screenOrientation="landscape"
```

on the `MainActivity` entry. Once that's in the manifest, Android **always** launches
the app in landscape — the same way a game does. No rotate prompt, no user action needed.

## Step-by-step: repo → installed app

### 1. Create the GitHub repo

- Create a new repo called `p-control` on GitHub.
- Upload every file/folder from this project to it (drag-and-drop works fine, same as
  you've done with PT Studios before) — just make sure the folder structure stays intact,
  especially the `.github/workflows/` folder.

### 2. Let GitHub Actions build it

- Once pushed, go to the **Actions** tab in your repo.
- You'll see "Build P-Control APK" running automatically (it triggers on every push to `main`).
- First run takes a few minutes — it's doing the equivalent of installing Android Studio's
  toolchain in the cloud, adding the Android project, patching the manifest, and compiling.

### 3. Download the APK

- When the run finishes (green checkmark), open it and scroll to **Artifacts**.
- Download `P-Control-debug-apk` — this is a `.zip` containing `app-debug.apk`.
- Unzip it on your phone (or unzip on PC and transfer the `.apk` file over).

### 4. Install on your phone

- Android will likely warn about "unknown sources" the first time — this is normal for
  any app installed outside the Play Store.
- Settings → allow installs from your file manager/browser (Android will prompt you
  the first time you tap the APK).
- Tap the APK file → Install → Open.
- It should launch straight into landscape, no rotation needed.

### 5. Making changes later

- Edit `src/App.jsx` for any UI change.
- Commit and push — the workflow rebuilds a fresh APK automatically every time.
- Re-download from the Actions tab and reinstall (Android will just update the existing app
  if the version code matches, or ask to replace it).

## Local preview (optional)

If you want to see UI changes instantly on a computer before waiting for a build:

```bash
npm install
npm run dev
```

This opens the web version in a browser. Note: the landscape lock **will not** activate in a
browser tab — that only happens in the real installed Android app, which is expected and fine.

## Next steps (not yet wired up)

- Connecting REC/STR/transition buttons to real vMix HTTP API calls or OBS-websocket calls
- Replacing the placeholder video boxes with live NDI/OBS video
- Replacing the source tile labels with live thumbnails

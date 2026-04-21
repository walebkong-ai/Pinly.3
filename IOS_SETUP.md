# iOS Setup

This repo keeps Pinly's existing product architecture intact: the iOS app is a Capacitor shell around the current Next.js app. The repo does not need a full rebuild or a second native product. Real native runs should load the live app from `CAPACITOR_SERVER_URL`.

## What is in the repo

- `ios/App/`: the existing Capacitor iOS shell
- `native-shell/index.html`: a committed fallback page used only when native setup is incomplete
- `scripts/ios-doctor.mjs`: native readiness checks
- `scripts/ios-sync.mjs`: guarded iOS sync wrapper
- `.env.capacitor.example`: native-only env template

## What stays local and should not be committed

- `.env.capacitor`
- `ios/App/App/GoogleService-Info.plist`
- `android/app/google-services.json`
- Xcode signing identities, provisioning profiles, simulator state, and derived data

## Prerequisites

1. Install dependencies with `npm install`.
2. Install full Xcode from `/Applications/Xcode.app`.
3. Point the active developer directory at full Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

4. Accept the Xcode license and let Xcode finish first-run setup.
5. Install at least one iOS simulator runtime in Xcode.

## Native env setup

1. Copy `.env.capacitor.example` to `.env.capacitor`.
2. Set `CAPACITOR_SERVER_URL` based on your target:

```bash
# iOS Simulator against a local Next.js server
CAPACITOR_SERVER_URL=http://127.0.0.1:3000

# Physical device on the same network
CAPACITOR_SERVER_URL=http://192.168.1.x:3000

# Staging / production shell
CAPACITOR_SERVER_URL=https://your-pinly-domain.vercel.app
```

3. Make sure your normal app env is also present in `.env` or `.env.local`, especially:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Those values are still part of the web runtime the native shell loads.

If you want the simulator flow to stay on a fixed local port, prefer:

```bash
npm run dev:native
```

That starts Next.js on `http://127.0.0.1:3001`, which pairs cleanly with:

```bash
CAPACITOR_SERVER_URL=http://127.0.0.1:3001
```

## Optional Firebase native push setup

Pinly keeps Firebase Messaging support, but the app should fail soft when the local file is missing.

To enable native push on iOS:

1. Download your app's Firebase plist.
2. Place it at `ios/App/App/GoogleService-Info.plist`.
3. Re-run `npm run ios:sync`.

Without that file:

- the repo can still sync cleanly
- the app can still build and launch
- native Firebase Messaging will not work

Once the file exists at that path, the Xcode project now auto-bundles it during the app build. You do not need to manually maintain a target resource entry for this local-only plist.

## Repo doctor

Run:

```bash
npm run ios:doctor
```

What it checks:

- expected repo files exist
- `CAPACITOR_SERVER_URL` is present and valid
- `GoogleService-Info.plist` is present or clearly reported missing
- `xcode-select` points at a developer directory
- `simctl` exists
- simulator runtimes are actually registered

Use strict mode in CI or when you want a failing exit code:

```bash
node scripts/ios-doctor.mjs --strict
```

## Sync the iOS shell

Normal sync:

```bash
npm run ios:sync
```

This requires a valid `CAPACITOR_SERVER_URL` and will stop early if the native shell is only partially configured.

Fallback-only sync:

```bash
npm run ios:sync:fallback
```

Use that only when you intentionally want the committed fallback shell instead of the live app origin.

## Open in Xcode

```bash
npm run ios:open
```

That runs the guarded sync first, then opens the real iOS project.

If you prefer to open it manually:

```bash
npx cap open ios
```

## Typical local development flow

1. Start the web app:

```bash
npm run dev:native
```

2. In another terminal, verify native readiness:

```bash
npm run ios:doctor
```

3. Sync the shell:

```bash
npm run ios:sync
```

4. Open Xcode:

```bash
npm run ios:open
```

5. Select an iPhone simulator and build/run.

## Repo issue vs local issue

### Repo-level issue

Treat it as a repo problem if one of these is true:

- `ios/App/App.xcodeproj` is missing
- `native-shell/index.html` is missing
- `capacitor.config.ts` points at the wrong fallback web directory
- env handling is unclear enough that `cap sync` produces misleading output
- required native source files like `Info.plist` or `AppDelegate.swift` are missing

### Local config issue

Treat it as local config if one of these is true:

- `.env.capacitor` is missing
- `CAPACITOR_SERVER_URL` is blank or invalid
- `ios/App/App/GoogleService-Info.plist` has not been added locally
- signing/capabilities have not been configured for your Apple account

### Machine-level Xcode issue

Treat it as machine-level when the repo is intact but Xcode tooling itself is unhealthy. Examples:

- `xcrun simctl list runtimes -j` returns an empty `runtimes` array
- `simctl boot` says it cannot determine the runtime bundle
- Xcode shows simulator runtimes in Downloads, but `simctl` still reports none
- Swift package artifacts are corrupted in a shared cache

These are not fixed by rebuilding Pinly from scratch.

## Known failure modes

### `CAPACITOR_SERVER_URL` missing

Symptom:

- `npm run ios:sync` refuses to continue
- app shows the committed fallback shell

Fix:

- create `.env.capacitor`
- set a valid `CAPACITOR_SERVER_URL`
- re-run `npm run ios:sync`

### `GoogleService-Info.plist` missing

Symptom:

- `npm run ios:doctor` reports a local config blocker
- app can still launch, but native Firebase Messaging stays unavailable

Fix:

- add `ios/App/App/GoogleService-Info.plist` locally
- re-run `npm run ios:sync`

### Empty simulator runtimes

Symptom:

- `xcrun simctl list runtimes -j` returns `"runtimes": []`
- builds fail with `No available simulator runtimes for platform iphonesimulator`

Fix:

- restart Xcode and Simulator
- if needed, reboot macOS
- reinstall the iOS simulator runtime from Xcode
- confirm `xcrun simctl list runtimes -j` shows a real runtime entry before retrying the build

### Broken shared Swift package cache

Symptom:

- package resolution or Firebase gRPC artifacts fail in ways unrelated to app code

Fix:

- retry with a fresh package cache or clear stale Xcode package artifacts
- if the project then compiles deeper into the build, the issue was environmental rather than architectural

## Current architecture reminder

Pinly is not a standalone native Swift app and does not currently define a separate iOS extension target. The iOS target is a single Capacitor app shell around the existing product. That is expected for this repo.

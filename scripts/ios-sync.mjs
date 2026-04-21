import { spawnSync } from "node:child_process";
import { iosPaths, loadNativeEnv, normalizeServerUrl, pathExists } from "./ios-readiness.mjs";

const allowFallbackShell = process.argv.includes("--allow-fallback-shell");
const { env, loadedFiles } = loadNativeEnv();

if (!pathExists(iosPaths.nativeShellIndex)) {
  console.error("native-shell/index.html is missing, so the Capacitor fallback shell cannot be synced.");
  process.exit(1);
}

const serverUrlStatus = normalizeServerUrl(env.CAPACITOR_SERVER_URL);

if (!allowFallbackShell) {
  if (!serverUrlStatus) {
    console.error("CAPACITOR_SERVER_URL is not set.");
    console.error("");
    console.error("Pinly's native shell expects a running or deployed Next.js origin.");
    console.error("Create .env.capacitor from .env.capacitor.example, set CAPACITOR_SERVER_URL, then rerun `npm run ios:sync`.");
    console.error("If you intentionally want only the fallback shell, run `npm run ios:sync:fallback` instead.");
    process.exit(1);
  }

  if (!serverUrlStatus.ok) {
    console.error(serverUrlStatus.message);
    process.exit(1);
  }
}

if (serverUrlStatus?.ok) {
  console.log(`Using CAPACITOR_SERVER_URL=${serverUrlStatus.value}`);

  if (serverUrlStatus.hostname === "localhost" || serverUrlStatus.hostname === "127.0.0.1") {
    console.log("Warning: localhost/127.0.0.1 is simulator-friendly, but physical devices need a LAN IP or deployed HTTPS URL.");
  }
} else {
  console.log("Proceeding without CAPACITOR_SERVER_URL. The synced shell will only include the committed native fallback page.");
}

if (!pathExists(iosPaths.googleServiceInfo)) {
  console.log("Warning: ios/App/App/GoogleService-Info.plist is missing. The app can still sync and build, but native Firebase Messaging will not work until that file is added locally.");
}

console.log(`Loaded env files: ${loadedFiles.length > 0 ? loadedFiles.join(", ") : "none"}`);
console.log("Running Capacitor sync for iOS...");

const result = spawnSync("npx", ["cap", "sync", "ios"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    ...env
  },
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Capacitor iOS sync completed.");

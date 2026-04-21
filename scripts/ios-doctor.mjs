import {
  getSimulatorRuntimeSummary,
  iosPaths,
  loadNativeEnv,
  normalizeServerUrl,
  pathExists,
  printSection,
  runCommand
} from "./ios-readiness.mjs";

const strictMode = process.argv.includes("--strict");
const { env, loadedFiles } = loadNativeEnv();

const repoBlockers = [];
const localConfigBlockers = [];
const machineBlockers = [];
const warnings = [];
const notes = [];

if (!pathExists(iosPaths.capacitorConfig)) {
  repoBlockers.push("capacitor.config.ts is missing.");
}

if (!pathExists(iosPaths.nativeShellIndex)) {
  repoBlockers.push("native-shell/index.html is missing.");
}

if (!pathExists(iosPaths.xcodeProject)) {
  repoBlockers.push("ios/App/App.xcodeproj is missing.");
}

if (!pathExists(iosPaths.infoPlist)) {
  repoBlockers.push("ios/App/App/Info.plist is missing.");
}

if (!pathExists(iosPaths.appDelegate)) {
  repoBlockers.push("ios/App/App/AppDelegate.swift is missing.");
}

if (pathExists(iosPaths.packageResolved)) {
  notes.push("Swift package versions are pinned in ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved.");
} else {
  warnings.push("Package.resolved is missing, so the first Xcode build will resolve Swift package versions locally.");
}

const serverUrlStatus = normalizeServerUrl(env.CAPACITOR_SERVER_URL);

if (!serverUrlStatus) {
  localConfigBlockers.push("CAPACITOR_SERVER_URL is not set. Pinly's native shell will only show the fallback page until you add .env.capacitor and re-sync.");
} else if (!serverUrlStatus.ok) {
  localConfigBlockers.push(serverUrlStatus.message);
} else {
  notes.push(`CAPACITOR_SERVER_URL resolved to ${serverUrlStatus.value}.`);

  if (serverUrlStatus.hostname === "localhost" || serverUrlStatus.hostname === "127.0.0.1") {
    warnings.push("CAPACITOR_SERVER_URL points at localhost/127.0.0.1. That is fine for simulator development, but physical devices need a LAN IP or deployed HTTPS URL.");
  }
}

if (!pathExists(iosPaths.googleServiceInfo)) {
  localConfigBlockers.push("ios/App/App/GoogleService-Info.plist is missing. Native Firebase Messaging will stay unavailable until you add it locally.");
} else {
  notes.push("GoogleService-Info.plist is present locally.");
}

if (!env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
  warnings.push("NEXT_PUBLIC_SUPABASE_URL is not set in the loaded env chain. Media diagnostics and some native-compiled env usage may be incomplete.");
}

if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
  warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in the loaded env chain. Media diagnostics and some native-compiled env usage may be incomplete.");
}

const xcodeSelect = runCommand("xcode-select", ["-p"]);

if (!xcodeSelect.ok) {
  machineBlockers.push("xcode-select could not find an active Xcode developer directory.");
} else {
  notes.push(`xcode-select points at ${xcodeSelect.stdout}.`);

  if (!xcodeSelect.stdout.includes("Xcode.app")) {
    warnings.push("xcode-select is not pointing at /Applications/Xcode.app. Native builds may still fail if Command Line Tools are selected instead of full Xcode.");
  }
}

const simctlPath = runCommand("xcrun", ["--find", "simctl"]);

if (!simctlPath.ok) {
  machineBlockers.push("xcrun could not find simctl, so iOS Simulator tooling is not available.");
} else {
  notes.push(`simctl is available at ${simctlPath.stdout}.`);
}

const simulatorRuntimeSummary = getSimulatorRuntimeSummary();

if (!simulatorRuntimeSummary.ok) {
  machineBlockers.push(`Simulator runtimes could not be queried: ${simulatorRuntimeSummary.message}`);
} else if (simulatorRuntimeSummary.runtimes.length === 0) {
  machineBlockers.push("Simulator runtimes are empty. This is a machine-level Xcode/CoreSimulator issue, not a Pinly repo issue.");
} else {
  notes.push(`Detected ${simulatorRuntimeSummary.runtimes.length} registered simulator runtime(s).`);
}

const verdict =
  repoBlockers.length > 0
    ? "Repo still has concrete iOS blockers."
    : localConfigBlockers.length > 0
      ? "Repo is structurally iOS-ready, but local native config is incomplete."
      : machineBlockers.length > 0
        ? "Repo is structurally iOS-ready pending local Xcode/simulator fix."
        : "Repo is structurally iOS-ready pending normal signing and app-specific local secrets.";

console.log("Pinly iOS Doctor");
console.log("");
console.log(`Loaded env files: ${loadedFiles.length > 0 ? loadedFiles.join(", ") : "none"}`);
console.log("");

printSection("Repo Blockers", repoBlockers);
printSection("Local Config Blockers", localConfigBlockers);
printSection("Machine Blockers", machineBlockers);
printSection("Warnings", warnings);
printSection("Notes", notes);

console.log(`Verdict: ${verdict}`);

if (strictMode && (repoBlockers.length > 0 || localConfigBlockers.length > 0 || machineBlockers.length > 0)) {
  process.exit(1);
}

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptsDir, "..");

export const iosPaths = {
  capacitorConfig: path.join(repoRoot, "capacitor.config.ts"),
  envExample: path.join(repoRoot, ".env.example"),
  nativeEnvExample: path.join(repoRoot, ".env.capacitor.example"),
  nativeShellIndex: path.join(repoRoot, "native-shell", "index.html"),
  xcodeProject: path.join(repoRoot, "ios", "App", "App.xcodeproj"),
  appDelegate: path.join(repoRoot, "ios", "App", "App", "AppDelegate.swift"),
  infoPlist: path.join(repoRoot, "ios", "App", "App", "Info.plist"),
  googleServiceInfo: path.join(repoRoot, "ios", "App", "App", "GoogleService-Info.plist"),
  packageResolved: path.join(
    repoRoot,
    "ios",
    "App",
    "App.xcodeproj",
    "project.xcworkspace",
    "xcshareddata",
    "swiftpm",
    "Package.resolved"
  )
};

const envFiles = [".env", ".env.local", ".env.capacitor"];

export function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

export function loadNativeEnv() {
  const mergedEnv = {};
  const loadedFiles = [];

  for (const envFile of envFiles) {
    const absolutePath = path.join(repoRoot, envFile);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(absolutePath, "utf8"));
    Object.assign(mergedEnv, parsed);
    loadedFiles.push(envFile);
  }

  return {
    loadedFiles,
    env: {
      ...mergedEnv,
      ...process.env
    }
  };
}

export function normalizeServerUrl(rawValue) {
  if (!rawValue) {
    return undefined;
  }

  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return undefined;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    return {
      ok: false,
      message: "CAPACITOR_SERVER_URL is set, but it is not a valid URL."
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      ok: false,
      message: "CAPACITOR_SERVER_URL must start with http:// or https://."
    };
  }

  return {
    ok: true,
    value: parsedUrl.toString().replace(/\/$/, ""),
    hostname: parsedUrl.hostname
  };
}

export function runCommand(command, args) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();

    return {
      ok: true,
      stdout
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString().trim() ?? "",
      stderr: error.stderr?.toString().trim() ?? "",
      error
    };
  }
}

export function getSimulatorRuntimeSummary() {
  const result = runCommand("xcrun", ["simctl", "list", "runtimes", "-j"]);

  if (!result.ok) {
    return {
      ok: false,
      message: result.stderr || result.stdout || "Unable to query simulator runtimes."
    };
  }

  try {
    const parsed = JSON.parse(result.stdout || "{}");
    const runtimes = Array.isArray(parsed.runtimes) ? parsed.runtimes : [];

    return {
      ok: true,
      runtimes
    };
  } catch {
    return {
      ok: false,
      message: "Simulator runtimes command returned invalid JSON."
    };
  }
}

export function printSection(title, items) {
  console.log(`${title}`);

  if (items.length === 0) {
    console.log("- None");
    console.log("");
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }

  console.log("");
}

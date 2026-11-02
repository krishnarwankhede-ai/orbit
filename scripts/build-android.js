"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const env = { ...process.env };

function isJavaHome(directory) {
  return Boolean(directory && fs.existsSync(path.join(directory, "bin", process.platform === "win32" ? "java.exe" : "java")));
}

function findJavaHome() {
  if (isJavaHome(env.JAVA_HOME)) return env.JAVA_HOME;
  const searchRoots = [
    path.join(env.ProgramFiles || "C:\\Program Files", "Microsoft"),
    path.join(env.ProgramFiles || "C:\\Program Files", "Java"),
    path.join(env.ProgramFiles || "C:\\Program Files", "Eclipse Adoptium"),
    path.join(env.LOCALAPPDATA || "", "Programs", "Eclipse Adoptium")
  ];
  const candidates = searchRoots.flatMap((directory) => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^(jdk|openjdk)/i.test(entry.name))
      .map((entry) => path.join(directory, entry.name));
  }).sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  return candidates.find(isJavaHome) || "";
}

function run(command, args, options = {}) {
  const isBatchFile = process.platform === "win32" && command.toLowerCase().endsWith(".bat");
  const executable = isBatchFile ? (env.ComSpec || "cmd.exe") : command;
  const commandArgs = isBatchFile
    ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: options.cwd || root,
    env,
    stdio: "inherit",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const javaHome = findJavaHome();
if (!javaHome) {
  throw new Error("Java 21 was not found. Install Microsoft OpenJDK 21, then run npm run mobile:apk again.");
}
env.JAVA_HOME = javaHome;
env.PATH = `${path.join(javaHome, "bin")}${path.delimiter}${env.PATH || ""}`;

const sdkPath = env.ANDROID_HOME || env.ANDROID_SDK_ROOT
  || path.join(env.LOCALAPPDATA || "", "Android", "Sdk");
if (!fs.existsSync(path.join(sdkPath, "platform-tools"))) {
  throw new Error("Android SDK was not found. Install it with Android Studio or set ANDROID_HOME.");
}
env.ANDROID_HOME = sdkPath;
env.ANDROID_SDK_ROOT = sdkPath;

console.log(`Using Java: ${javaHome}`);
console.log(`Using Android SDK: ${sdkPath}`);
run(process.execPath, [path.join(__dirname, "sync-mobile.js")]);
run(process.execPath, [path.join(root, "node_modules", "@capacitor", "cli", "bin", "capacitor"), "sync", "android"]);
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  ["assembleDebug"],
  { cwd: path.join(root, "android") }
);

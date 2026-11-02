"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const webFiles = ["index.html", "app.js", "styles.css"];

fs.mkdirSync(output, { recursive: true });
for (const file of webFiles) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.copyFileSync(
  path.join(root, "node_modules", "@capacitor", "core", "dist", "capacitor.js"),
  path.join(output, "capacitor.js")
);

console.log(`Prepared ${webFiles.length + 1} offline app files in www.`);

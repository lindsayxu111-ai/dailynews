const fs = require("fs");
const path = require("path");

const outDir = "_site";
const entries = [
  "index.html",
  "archive.html",
  "assets",
  "daily",
  "news"
];

function copyIfExists(entry) {
  if (!fs.existsSync(entry)) return;
  const target = path.join(outDir, entry);
  fs.cpSync(entry, target, { recursive: true });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  copyIfExists(entry);
}

for (const file of fs.readdirSync(".")) {
  if (/^wechat-digest-\d{4}-\d{2}-\d{2}\.txt$/.test(file)) {
    copyIfExists(file);
  }
}

fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");
console.log(`Prepared ${outDir} for GitHub Pages`);

const fs = require("fs");
const path = require("path");

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/validate-daily.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(file, "utf8"));
const requiredIssueFields = ["date", "publishedAt", "updatedAt", "weather", "sections"];
const missingIssueFields = requiredIssueFields.filter((field) => issue[field] == null);

if (missingIssueFields.length) {
  throw new Error(`Missing issue fields: ${missingIssueFields.join(", ")}`);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.date)) {
  throw new Error("Issue date must use YYYY-MM-DD");
}

if (!Array.isArray(issue.sections) || issue.sections.length === 0) {
  throw new Error("Issue must include at least one section");
}

const ids = new Set();
let itemCount = 0;

for (const section of issue.sections) {
  for (const field of ["id", "title", "items"]) {
    if (section[field] == null) throw new Error(`Section missing field ${field}`);
  }
  if (!Array.isArray(section.items)) throw new Error(`Section ${section.id} items must be an array`);
  for (const item of section.items) {
    itemCount += 1;
    for (const field of ["id", "rank", "title", "summary", "whyItMatters", "sources"]) {
      if (item[field] == null) throw new Error(`Item in ${section.id} missing field ${field}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate item id: ${item.id}`);
    ids.add(item.id);
    if (!Array.isArray(item.sources) || item.sources.length === 0) {
      throw new Error(`Item ${item.id} must include at least one source`);
    }
    for (const source of item.sources) {
      if (!source.name || !source.url) throw new Error(`Item ${item.id} has invalid source`);
      new URL(source.url);
    }
  }
}

if (itemCount !== 50) {
  throw new Error(`Expected 50 items, found ${itemCount}`);
}

console.log(`Valid issue: ${path.basename(file)} (${itemCount} items)`);

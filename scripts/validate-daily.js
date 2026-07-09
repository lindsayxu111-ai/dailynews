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

function assertCleanText(value, label) {
  if (/&(?:amp;)?nbsp;|&#160;|&#x0*a0;/i.test(String(value || ""))) {
    throw new Error(`${label} contains visible HTML space entity`);
  }
}

function countMatches(text, pattern) {
  return Array.from(String(text || "").matchAll(pattern)).length;
}

function assertChineseDisplayText(value, label, minHan = 6) {
  const text = String(value || "");
  const han = countMatches(text, /\p{Script=Han}/gu);
  const latinWords = countMatches(text, /\b[A-Za-z]{3,}\b/g);
  if (han < minHan || (latinWords > han && han < 14)) {
    throw new Error(`${label} is not Chinese-display ready`);
  }
}

for (const field of ["label", "condition", "humidity", "wind"]) {
  if (issue.weather?.[field] != null) assertCleanText(issue.weather[field], `weather.${field}`);
}

for (const section of issue.sections) {
  for (const field of ["id", "title", "items"]) {
    if (section[field] == null) throw new Error(`Section missing field ${field}`);
  }
  assertCleanText(section.title, `section ${section.id} title`);
  assertCleanText(section.note, `section ${section.id} note`);
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
    assertCleanText(item.title, `item ${item.id} title`);
    assertCleanText(item.summary, `item ${item.id} summary`);
    assertCleanText(item.whyItMatters, `item ${item.id} whyItMatters`);
    assertChineseDisplayText(item.title, `item ${item.id} title`, 4);
    assertChineseDisplayText(item.summary, `item ${item.id} summary`);
    for (const tag of item.tags || []) assertCleanText(tag, `item ${item.id} tag`);
    for (const source of item.sources) {
      if (!source.name || !source.url) throw new Error(`Item ${item.id} has invalid source`);
      assertCleanText(source.name, `item ${item.id} source name`);
      new URL(source.url);
    }
  }
}

if (itemCount !== 50) {
  throw new Error(`Expected 50 items, found ${itemCount}`);
}

console.log(`Valid issue: ${path.basename(file)} (${itemCount} items)`);

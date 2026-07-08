const fs = require("fs");
const path = require("path");

const issueFile = process.argv[2];

if (!issueFile) {
  console.error("Usage: node scripts/seed-candidates-from-issue.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
const candidate = {
  date: issue.date,
  collectedAt: issue.updatedAt,
  weather: issue.weather,
  sections: issue.sections.map((section) => ({
    id: section.id,
    items: section.items.map((item) => ({
      title: item.title,
      summary: item.summary,
      whyItMatters: item.whyItMatters,
      tags: item.tags,
      sources: item.sources
    }))
  }))
};

fs.mkdirSync(path.join("data", "candidates"), { recursive: true });
fs.writeFileSync(path.join("data", "candidates", `${issue.date}.json`), `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
console.log(`Wrote data/candidates/${issue.date}.json`);

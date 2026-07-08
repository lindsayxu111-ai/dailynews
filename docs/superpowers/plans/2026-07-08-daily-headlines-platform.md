# Daily Headlines Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current static daily brief into a data-driven daily news product with source detail pages, archive browsing, WeChat sharing, and an 8:00 AM update workflow.

**Architecture:** Keep the first implementation static-first: JSON data is the source of truth, Node scripts generate HTML pages, and the current `index.html` design becomes the daily-page template. This avoids a backend until automation and editorial workflow are proven.

**Tech Stack:** Static HTML/CSS, Node.js build scripts, JSON data files, optional cron/scheduled automation later.

---

## File Structure

- Create `data/daily/2026-07-08.json`: source-of-truth issue data for the current daily brief.
- Create `scripts/validate-daily.js`: validates daily JSON structure and source links.
- Create `scripts/generate-wechat.js`: generates `wechat-digest-YYYY-MM-DD.txt` from daily JSON.
- Create `scripts/build-daily.js`: renders the daily page and news detail pages from JSON.
- Create `daily/2026-07-08.html`: generated daily page for archive-friendly URLs.
- Create `news/2026-07-08/*.html`: generated news detail pages.
- Create `archive.html`: history index for daily issues.
- Create `admin.html`: static editorial review prototype.
- Modify `index.html`: keep it as the latest issue entry page.
- Keep `assets/daily-headline-blue.svg`: current visual asset.

## Task 1: Create Daily Data Schema And Current Issue JSON

**Files:**
- Create: `data/daily/2026-07-08.json`
- Create: `scripts/validate-daily.js`

- [ ] **Step 1: Create the data directory**

Run:

```bash
mkdir -p data/daily scripts
```

Expected: directories exist.

- [ ] **Step 2: Create `data/daily/2026-07-08.json`**

Use this shape:

```json
{
  "date": "2026-07-08",
  "publishedAt": "2026-07-08T08:00:00+08:00",
  "updatedAt": "2026-07-08T16:30:00+08:00",
  "weather": {
    "label": "今日天气参考",
    "condition": "晴",
    "temperatureC": 31,
    "feelsLikeC": 31,
    "humidity": "63%",
    "wind": "南南西风 14 km/h"
  },
  "mustRead": [
    "official-01",
    "world-01",
    "buzz-01",
    "tech-01",
    "finance-01"
  ],
  "sections": [
    {
      "id": "official",
      "title": "国内官方新闻",
      "kicker": "Domestic",
      "note": "以新华社、央视网、国务院英文站等可核验来源为主，偏重政策、灾害、民生和公共事务。",
      "items": [
        {
          "id": "official-01",
          "rank": 1,
          "title": "国家科学技术奖励大会等在京召开",
          "summary": "习近平颁奖并讲话，科技强国建设成为当天国内主线。",
          "whyItMatters": "科技奖励大会通常释放国家科技政策方向，对科研投入、产业布局和社会关注度都有引导作用。",
          "tags": ["官方", "科技政策", "必看"],
          "sources": [
            {
              "name": "新华社",
              "url": "https://www.news.cn/politics/leaders/20260708/af5ccbea32284dc09bbe84f704a459cf/c.html",
              "type": "official"
            },
            {
              "name": "央视网",
              "url": "https://news.cctv.com/2026/07/08/ARTIczdneR9RGFX7s7AwjA9u260708.shtml",
              "type": "official"
            }
          ]
        }
      ]
    }
  ]
}
```

After this step, add the remaining current page items into the same structure section by section.

- [ ] **Step 3: Create `scripts/validate-daily.js`**

```js
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

if (!Array.isArray(issue.sections) || issue.sections.length === 0) {
  throw new Error("Issue must include at least one section");
}

const ids = new Set();
for (const section of issue.sections) {
  for (const field of ["id", "title", "items"]) {
    if (section[field] == null) throw new Error(`Section missing field ${field}`);
  }
  if (!Array.isArray(section.items)) throw new Error(`Section ${section.id} items must be an array`);
  for (const item of section.items) {
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

console.log(`Valid issue: ${path.basename(file)} (${ids.size} items)`);
```

- [ ] **Step 4: Validate the JSON**

Run:

```bash
node scripts/validate-daily.js data/daily/2026-07-08.json
```

Expected output:

```text
Valid issue: 2026-07-08.json (50 items)
```

## Task 2: Generate WeChat Digest From JSON

**Files:**
- Create: `scripts/generate-wechat.js`
- Modify: `wechat-digest-2026-07-08.txt`

- [ ] **Step 1: Create `scripts/generate-wechat.js`**

```js
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/generate-wechat.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(file, "utf8"));
const dateLabel = issue.date.replace(/-/g, "年").replace(/年(\d{2})年(\d{2})$/, "年$1月$2日");
const weather = issue.weather;

const lines = [
  `【每日头条｜${dateLabel}】`,
  `${weather.label}：${weather.condition}，${weather.temperatureC}°C，体感${weather.feelsLikeC}°C，湿度${weather.humidity}，${weather.wind}。`,
  "今天重点看五条线：防汛救灾、国际冲突、全网热议、科技圈、财经市场。",
  ""
];

const sectionNames = ["一", "二", "三", "四", "五"];
issue.sections.forEach((section, index) => {
  lines.push(`${sectionNames[index]}、${section.title}`);
  section.items.slice(0, section.id === "official" || section.id === "world" ? 5 : section.id === "tech" ? 8 : 10).forEach((item, itemIndex) => {
    lines.push(`${itemIndex + 1}. ${item.summary}`);
  });
  lines.push("");
});

lines.push("提示：全网热议代表公开平台热度和讨论强度，不等同于事实重要性；财经内容仅作信息梳理，不构成投资建议；涉灾、市场和国际冲突信息请继续关注权威更新。");

const out = `wechat-digest-${issue.date}.txt`;
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out}`);
```

- [ ] **Step 2: Run the generator**

Run:

```bash
node scripts/generate-wechat.js data/daily/2026-07-08.json
```

Expected:

```text
Wrote wechat-digest-2026-07-08.txt
```

## Task 3: Add News Detail Pages With Original Sources

**Files:**
- Create: `scripts/build-daily.js`
- Create: `news/2026-07-08/*.html`

- [ ] **Step 1: Create the detail renderer in `scripts/build-daily.js`**

```js
const fs = require("fs");
const path = require("path");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderDetail(issue, section, item) {
  const sourceLinks = item.sources.map((source) => (
    `<a class="source-link" href="${escapeHtml(source.url)}">${escapeHtml(source.name)}</a>`
  )).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)} | 每日头条</title>
  <style>
    body { margin: 0; background: #eaf4fb; color: #10233d; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; line-height: 1.7; }
    main { width: min(860px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 56px; }
    article { border: 1px solid #c9dced; border-radius: 16px; background: #fff; padding: 28px; box-shadow: 0 20px 44px rgba(22, 50, 84, 0.12); }
    a { color: #2d8fce; text-decoration: none; }
    h1 { margin: 10px 0 12px; font-size: clamp(30px, 5vw, 48px); line-height: 1.12; }
    .meta { color: #5e7188; font-weight: 800; }
    .summary { font-size: 19px; color: #304860; }
    .source-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .source-link { padding: 7px 10px; border: 1px solid #c9dced; border-radius: 999px; background: #f3f9ff; font-weight: 800; }
    .back { display: inline-block; margin-bottom: 18px; font-weight: 900; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="../../daily/${issue.date}.html">返回当日头条</a>
    <article>
      <div class="meta">${escapeHtml(section.title)} · 第 ${item.rank} 条</div>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <h2>为什么重要</h2>
      <p>${escapeHtml(item.whyItMatters)}</p>
      <h2>原出处</h2>
      <div class="source-list">${sourceLinks}</div>
    </article>
  </main>
</body>
</html>`;
}

function build(issueFile) {
  const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
  const detailDir = path.join("news", issue.date);
  fs.mkdirSync(detailDir, { recursive: true });
  for (const section of issue.sections) {
    for (const item of section.items) {
      fs.writeFileSync(path.join(detailDir, `${item.id}.html`), renderDetail(issue, section, item), "utf8");
    }
  }
  console.log(`Built details for ${issue.date}`);
}

build(process.argv[2] || "data/daily/2026-07-08.json");
```

- [ ] **Step 2: Build detail pages**

Run:

```bash
node scripts/build-daily.js data/daily/2026-07-08.json
```

Expected:

```text
Built details for 2026-07-08
```

## Task 4: Link Cards To Detail Pages

**Files:**
- Modify: `index.html`
- Modify after generation: `daily/2026-07-08.html`

- [ ] **Step 1: Wrap each generated card title in a detail link**

Pattern:

```html
<h3><a href="news/2026-07-08/official-01.html">国家科学技术奖励大会等在京召开</a></h3>
```

Expected behavior: clicking a card title opens its detail page.

- [ ] **Step 2: Add direct source link behavior inside detail page**

Each source pill remains an external link:

```html
<a class="source-link" href="https://www.news.cn/politics/leaders/20260708/af5ccbea32284dc09bbe84f704a459cf/c.html">新华社</a>
```

Expected behavior: clicking source opens original page.

## Task 5: Add Archive Page

**Files:**
- Create: `archive.html`

- [ ] **Step 1: Create `archive.html`**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>历史日报 | 每日头条</title>
  <style>
    body { margin: 0; background: #eaf4fb; color: #10233d; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 36px 0 64px; }
    h1 { font-size: clamp(38px, 7vw, 72px); margin: 0 0 24px; }
    .archive-card { display: block; padding: 20px; border: 1px solid #c9dced; border-radius: 16px; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 14px 30px rgba(22, 50, 84, 0.1); }
    .archive-card strong { display: block; font-size: 24px; }
    .archive-card span { display: block; margin-top: 6px; color: #5e7188; }
  </style>
</head>
<body>
  <main>
    <h1>历史日报</h1>
    <a class="archive-card" href="daily/2026-07-08.html">
      <strong>2026年7月8日</strong>
      <span>50 条精选内容 · 5 个阅读板块 · 08:00 发布</span>
    </a>
  </main>
</body>
</html>
```

- [ ] **Step 2: Add archive link to the daily page nav**

Add one nav link:

```html
<a href="archive.html">历史日报</a>
```

Expected: user can reach archive from current page.

## Task 6: Add Static Admin Review Prototype

**Files:**
- Create: `admin.html`

- [ ] **Step 1: Create `admin.html`**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>审核后台 | 每日头条</title>
  <style>
    body { margin: 0; background: #eef6fc; color: #10233d; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
    main { width: min(1100px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0; }
    .toolbar, .item { border: 1px solid #c9dced; border-radius: 16px; background: #fff; padding: 18px; box-shadow: 0 12px 26px rgba(22, 50, 84, 0.08); }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    button { border: 0; border-radius: 999px; background: #18365d; color: white; padding: 10px 14px; font-weight: 900; }
    .list { display: grid; gap: 12px; }
    .meta { color: #5e7188; font-size: 13px; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <div class="toolbar">
      <div>
        <h1>今日审核</h1>
        <p>发布前检查标题、摘要、来源和今日必看。</p>
      </div>
      <button>发布今日日报</button>
    </div>
    <div class="list">
      <article class="item">
        <div class="meta">国内官方 · official-01 · 多源确认</div>
        <h2>国家科学技术奖励大会等在京召开</h2>
        <p>习近平颁奖并讲话，科技强国建设成为当天国内主线。</p>
        <button>标记必看</button>
      </article>
    </div>
  </main>
</body>
</html>
```

Expected: static backend prototype opens and shows the editorial workflow shape.

## Task 7: Schedule 8:00 AM Update Workflow

**Files:**
- Create: `docs/product/update-workflow.md`

- [ ] **Step 1: Document the update workflow**

Create:

```markdown
# 每日 8 点更新流程

## 时间表

- 07:30 抓取候选新闻。
- 07:40 去重和合并同类新闻。
- 07:45 检查来源和原出处链接。
- 07:50 生成摘要、今日必看和微信版。
- 07:55 人工快速审核。
- 08:00 发布当天日报。

## 发布产物

- `data/daily/YYYY-MM-DD.json`
- `daily/YYYY-MM-DD.html`
- `news/YYYY-MM-DD/*.html`
- `wechat-digest-YYYY-MM-DD.txt`
- `archive.html`

## 失败策略

- 抓取失败：保留昨日版本，显示更新延迟。
- 单一来源：标记单来源待确认。
- 发布失败：不覆盖线上最新稳定页面。
```

- [ ] **Step 2: Later create automation**

Use Codex app automation or system cron to run the build at 08:00. The command should be:

```bash
node scripts/validate-daily.js data/daily/YYYY-MM-DD.json
node scripts/generate-wechat.js data/daily/YYYY-MM-DD.json
node scripts/build-daily.js data/daily/YYYY-MM-DD.json
```

Expected: all commands exit `0` before publishing.

## Self-Review

Spec coverage:

- Daily update at 8:00 is covered by Task 7.
- Original source links are covered by Tasks 1, 3, and 4.
- WeChat sharing is covered by Task 2.
- Historical archive is covered by Task 5.
- Admin review is covered by Task 6.
- Current static design remains reusable through `index.html` and generated `daily/*.html`.

Placeholder scan:

- This plan intentionally avoids placeholder terms.
- Each task has exact paths and commands.

Type consistency:

- `DailyIssue`, `NewsItem`, and `Source` fields match between the product design and JSON/script tasks.

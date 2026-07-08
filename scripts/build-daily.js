const fs = require("fs");
const path = require("path");

const issueFile = process.argv[2] || "data/daily/2026-07-08.json";
const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
const template = fs.readFileSync("index.html", "utf8");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatChineseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function formatDateParts(date) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatWeekday(date) {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return weekdays[new Date(`${date}T00:00:00+08:00`).getDay()];
}

function formatIssueTime(value) {
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "08:00";
}

function relativeAssetPath(prefix, value) {
  return value.replaceAll('href="assets/', `href="${prefix}assets/`).replaceAll('url("assets/', `url("${prefix}assets/`);
}

function detailHref(item, prefix = "") {
  return `${prefix}news/${issue.date}/${item.id}.html`;
}

function renderDetail(section, item) {
  const sourceLinks = item.sources
    .map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>`)
    .join("");
  const tagLinks = (item.tags || [])
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)} | 每日头条</title>
  <style>
    :root { --paper: #eaf4fb; --surface: #ffffff; --ink: #10233d; --muted: #5e7188; --line: #c9dced; --accent: #2d8fce; --orange: #e47f52; --green: #7ec7b5; --yellow: #f4c95d; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 18% 0%, rgba(119, 207, 255, 0.34), transparent 30rem), linear-gradient(140deg, #eaf4fb 0%, #dbeaf6 46%, #eef7fd 100%); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.7; }
    main { width: min(900px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 58px; }
    .back { display: inline-flex; align-items: center; min-height: 38px; margin-bottom: 18px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.78); color: #28415f; text-decoration: none; font-weight: 900; }
    article { overflow: hidden; border: 1px solid rgba(68, 118, 158, 0.22); border-radius: 18px; background: var(--surface); box-shadow: 0 22px 55px rgba(22, 50, 84, 0.14); }
    .hero { padding: 28px; background: linear-gradient(105deg, rgba(255,255,255,.98), rgba(231,246,255,.92)); border-top: 6px solid var(--accent); }
    .meta { color: var(--orange); font-size: 13px; font-weight: 900; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 12px 0; font-size: clamp(30px, 6vw, 56px); line-height: 1.08; letter-spacing: 0; }
    .summary { margin: 0; color: #304860; font-size: clamp(18px, 2.2vw, 22px); }
    .content { padding: 26px 28px 30px; }
    h2 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 0 0 20px; color: #304860; }
    .tag-list, .source-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 24px; }
    .tag-list span { padding: 5px 9px; border: 1px solid rgba(126, 199, 181, 0.42); border-radius: 999px; background: #effbf9; color: #247564; font-size: 13px; font-weight: 850; }
    .source-link { padding: 8px 11px; border: 1px solid #c9dced; border-radius: 999px; background: #f3f9ff; color: #1d5f90; text-decoration: none; font-weight: 900; }
    .source-link:hover { border-color: rgba(45, 143, 206, 0.45); background: #e7f6ff; }
    .note { margin-top: 22px; padding: 14px; border-radius: 8px; background: #fff8df; color: #6d5215; font-size: 14px; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="../../index.html#${escapeHtml(section.id)}">返回当日头条</a>
    <article>
      <div class="hero">
        <div class="meta">${escapeHtml(section.title)} · 第 ${item.rank} 条 · ${formatChineseDate(issue.date)}</div>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="summary">${escapeHtml(item.summary)}</p>
      </div>
      <div class="content">
        <h2>为什么重要</h2>
        <p>${escapeHtml(item.whyItMatters)}</p>
        <h2>关键词</h2>
        <div class="tag-list">${tagLinks}</div>
        <h2>原出处</h2>
        <div class="source-list">${sourceLinks}</div>
        <div class="note">提示：点击上方来源可查看原出处。平台热榜代表讨论热度，不等同于事实重要性；财经内容仅作信息梳理，不构成投资建议。</div>
      </div>
    </article>
  </main>
</body>
</html>`;
}

function allItems() {
  return issue.sections.flatMap((section) => section.items.map((item) => ({ section, item })));
}

function injectArchiveLink(html, prefix = "") {
  if (html.includes('href="archive.html"') || html.includes('href="../archive.html"')) return html;
  return html.replace('<a href="#finance">财经投资</a>', `<a href="#finance">财经投资</a>\n      <a href="${prefix}archive.html">历史日报</a>`);
}

function normalizeArchiveLink(html, prefix = "") {
  return html.replace(/href="(?:\.\.\/)?archive\.html"/g, `href="${prefix}archive.html"`);
}

function renderShareText() {
  const weather = issue.weather;
  const lines = [
    `【每日头条｜${formatChineseDate(issue.date)}】`,
    `${weather.label}：${weather.condition}，${weather.temperatureC}°C，体感${weather.feelsLikeC}°C，湿度${weather.humidity}，${weather.wind}。`,
    "今天重点看五条线：防汛救灾、国际冲突、全网热议、科技圈、财经市场。",
    ""
  ];

  issue.sections.forEach((section, index) => {
    const first = section.items[0];
    const title = section.title.replace(/\s*10\s*条$/, "");
    if (first) lines.push(`${index + 1}. ${title}：${first.summary}`);
  });

  lines.push("");
  lines.push("提示：平台热榜代表讨论热度，不等同于事实重要性；财经内容仅作信息梳理，不构成投资建议。");
  return lines.join("\n");
}

function renderSection(section, prefix = "") {
  const pillText = {
    official: "官方信息源",
    world: "多源比对",
    buzz: "热榜 + 讨论焦点",
    tech: "科技商业",
    finance: "投资者关注"
  }[section.id] || "精选内容";

  const cards = section.items.map((item) => {
    const sources = item.sources.map((source) => (
      `<a class="source" href="${escapeHtml(source.url)}">${escapeHtml(source.name)}</a>`
    )).join("");
    return `        <article class="card"><div class="num">${String(item.rank).padStart(2, "0")}</div><div><h3><a href="${detailHref(item, prefix)}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><div class="sources">${sources}</div></div></article>`;
  }).join("\n");

  return `    <section class="section ${escapeHtml(section.className || section.id)}" id="${escapeHtml(section.id)}">
      <div class="section-head">
        <div>
          <div class="section-kicker">${escapeHtml(section.kicker || section.id)}</div>
          <h2>${escapeHtml(section.title)}</h2>
          <p class="section-note">${escapeHtml(section.note || "")}</p>
        </div>
        <span class="pill">${escapeHtml(pillText)}</span>
      </div>
      <div class="news-grid">
${cards}
      </div>
    </section>`;
}

function renderSections(prefix = "") {
  return issue.sections.map((section) => renderSection(section, prefix)).join("\n\n");
}

function replaceDynamicContent(html, prefix = "") {
  const { year, month, day } = formatDateParts(issue.date);
  const weather = issue.weather;
  const updatedTime = formatIssueTime(issue.updatedAt);

  let next = html;
  next = next.replace(/<title>每日头条 \| .*?<\/title>/, `<title>每日头条 | ${issue.date}</title>`);
  next = next.replace(/<span class="pill strong">[\s\S]*?<\/span>/, `<span class="pill strong">${formatChineseDate(issue.date)}</span>`);
  next = next.replace(/<span class="pill">北京时间 [\s\S]*? 整理<\/span>/, `<span class="pill">北京时间 ${updatedTime} 整理</span>`);
  next = next.replace(/<time class="cover-date" datetime="[^"]+">[\s\S]*?<\/time>/, `<time class="cover-date" datetime="${issue.date}"><span class="cover-year">${year}年</span><span class="cover-month-day">${month}月${day}日</span></time>`);
  next = next.replace(/<div class="cover-day">[\s\S]*?<\/div>/, `<div class="cover-day">${formatWeekday(issue.date)} · 北京时间 ${updatedTime} 整理</div>`);
  next = next.replace(/<div class="cover-temp">[\s\S]*?<\/div>/, `<div class="cover-temp">\n              <strong>${weather.temperatureC}°C</strong>\n              <span>${escapeHtml(weather.condition)}</span>\n            </div>`);
  next = next.replace(/<div class="cover-weather-grid" aria-label="天气细节">[\s\S]*?<\/div>\s*<div class="weather-illustration"/, `<div class="cover-weather-grid" aria-label="天气细节">\n            <div class="cover-weather-item"><span>Feels Like</span>体感 ${weather.feelsLikeC}°C</div>\n            <div class="cover-weather-item"><span>Humidity</span>湿度 ${escapeHtml(weather.humidity)}</div>\n            <div class="cover-weather-item"><span>Wind</span>${escapeHtml(weather.wind)}</div>\n          </div>\n          <div class="weather-illustration"`);
  next = next.replace(/<div class="metric"><strong>\d+°C<\/strong><span>今日天气<\/span><\/div>/, `<div class="metric"><strong>${weather.temperatureC}°C</strong><span>今日天气</span></div>`);
  next = next.replace(/<div class="wechat-time">[\s\S]*?<\/div>/, `<div class="wechat-time">今天 ${updatedTime}</div>`);
  next = next.replace(/<pre class="share-text" id="shareText">[\s\S]*?<\/pre>/, `<pre class="share-text" id="shareText">${escapeHtml(renderShareText())}</pre>`);
  next = next.replace(/    <section class="section [\s\S]*?    <footer class="footer">/, `${renderSections(prefix)}\n\n    <footer class="footer">`);
  return next;
}

function writeDetails() {
  const detailDir = path.join("news", issue.date);
  fs.mkdirSync(detailDir, { recursive: true });
  for (const section of issue.sections) {
    for (const item of section.items) {
      fs.writeFileSync(path.join(detailDir, `${item.id}.html`), renderDetail(section, item), "utf8");
    }
  }
}

function renderDaily(prefix = "") {
  let html = template;
  html = replaceDynamicContent(html, prefix);
  html = injectArchiveLink(html, prefix);
  html = normalizeArchiveLink(html, prefix);
  html = relativeAssetPath(prefix, html);
  return html;
}

function renderArchive() {
  const total = issue.sections.reduce((sum, section) => sum + section.items.length, 0);
  const sections = issue.sections.map((section) => section.title.replace(/\s*10\s*条$/, "")).join(" / ");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>历史日报 | 每日头条</title>
  <style>
    :root { --paper: #eaf4fb; --ink: #10233d; --muted: #5e7188; --line: #c9dced; --accent: #2d8fce; --orange: #e47f52; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at 18% 0%, rgba(119, 207, 255, 0.34), transparent 30rem), linear-gradient(140deg, #eaf4fb 0%, #dbeaf6 46%, #eef7fd 100%); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 36px 0 64px; }
    .back { color: #28415f; text-decoration: none; font-weight: 900; }
    h1 { margin: 18px 0 24px; font-size: clamp(40px, 7vw, 76px); line-height: 1; }
    .archive-card { display: grid; gap: 8px; padding: 22px; border: 1px solid var(--line); border-radius: 18px; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 14px 30px rgba(22, 50, 84, 0.1); }
    .archive-card strong { color: var(--orange); font-size: 26px; }
    .archive-card span { color: var(--muted); font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="index.html">返回最新日报</a>
    <h1>历史日报</h1>
    <a class="archive-card" href="daily/${issue.date}.html">
      <strong>${formatChineseDate(issue.date)}</strong>
      <span>${total} 条精选内容 · ${issue.sections.length} 个阅读板块 · 08:00 发布</span>
      <span>${escapeHtml(sections)}</span>
    </a>
  </main>
</body>
</html>`;
}

function renderAdmin() {
  const rows = allItems().map(({ section, item }) => {
    const sourceCount = item.sources.length;
    return `<article class="item">
      <div class="meta">${escapeHtml(section.title)} · ${escapeHtml(item.id)} · ${sourceCount > 1 ? "多源确认" : "单源待复核"}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <div class="actions"><button>标记必看</button><button class="ghost">检查来源</button></div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>审核后台 | 每日头条</title>
  <style>
    :root { --ink: #10233d; --muted: #5e7188; --line: #c9dced; --accent: #2d8fce; --orange: #e47f52; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef6fc; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0; }
    .toolbar, .item { border: 1px solid var(--line); border-radius: 16px; background: #fff; padding: 18px; box-shadow: 0 12px 26px rgba(22, 50, 84, 0.08); }
    .toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1, h2, p { margin-top: 0; }
    p { color: var(--muted); }
    button { border: 0; border-radius: 999px; background: #18365d; color: white; padding: 10px 14px; font: inherit; font-weight: 900; }
    button.ghost { border: 1px solid var(--line); background: #f3f9ff; color: #1d5f90; }
    .list { display: grid; gap: 12px; }
    .meta { color: var(--orange); font-size: 13px; font-weight: 900; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  </style>
</head>
<body>
  <main>
    <div class="toolbar">
      <div>
        <h1>今日审核</h1>
        <p>发布前检查标题、摘要、来源、今日必看和微信分享版。当前为静态原型，后续可接入真实后台。</p>
      </div>
      <button>发布今日日报</button>
    </div>
    <div class="list">${rows}</div>
  </main>
</body>
</html>`;
}

writeDetails();
fs.mkdirSync("daily", { recursive: true });
fs.writeFileSync("index.html", renderDaily(""), "utf8");
fs.writeFileSync(path.join("daily", `${issue.date}.html`), renderDaily("../"), "utf8");
fs.writeFileSync("archive.html", renderArchive(), "utf8");
fs.writeFileSync("admin.html", renderAdmin(), "utf8");

console.log(`Built ${issue.date}: index.html, daily/${issue.date}.html, news/${issue.date}/*.html, archive.html, admin.html`);

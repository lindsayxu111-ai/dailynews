const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2] || "index.html";
const html = fs.readFileSync(inputFile, "utf8");

function decodeHtml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
}

function getMatch(pattern, value, fallback = "") {
  const match = value.match(pattern);
  return match ? stripTags(match[1]) : fallback;
}

function getRawMatch(pattern, value, fallback = "") {
  const match = value.match(pattern);
  return match ? match[1] : fallback;
}

function formatChineseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function getWhyItMatters(sectionId, item) {
  const base = {
    official: "这条信息来自官方或权威渠道，关系到政策方向、公共事务或民生安排，适合作为当天国内判断的基础。",
    world: "这条国际信息会影响地区安全、外交关系或全球市场情绪，需要结合多家来源持续观察。",
    buzz: "这条内容代表公开平台上的讨论强度和传播热度，适合了解公众今天最集中关注什么。",
    tech: "这条科技信息关系到 AI、智能汽车、芯片、硬件或平台产品的产业变化，适合跟踪科技商业趋势。",
    finance: "这条财经信息关系到市场情绪、资产价格或产业链变量，适合投资者做信息跟踪，不构成投资建议。"
  };

  if (item.rank === 1) {
    return `${base[sectionId]}它位于本板块首条，说明今天需要优先阅读。`;
  }
  return base[sectionId];
}

function getTags(sectionId, item) {
  const sectionTags = {
    official: ["官方", "国内"],
    world: ["国际", "多源"],
    buzz: ["热榜", "讨论"],
    tech: ["科技", "产业"],
    finance: ["财经", "投资者关注"]
  };
  const tags = [...(sectionTags[sectionId] || [])];
  if (item.rank === 1) tags.push("必看");
  return tags;
}

const sectionPattern = /<section class="section ([^"]+)" id="([^"]+)">([\s\S]*?)<\/section>/g;
const sections = [];
const sectionNotes = {
  official: "以新华社、央视网、国务院英文站等可核验来源为主，偏重政策、灾害、民生和公共事务。",
  world: "以中文可读的全球要闻源和权威媒体聚合为主，优先选择冲突、外交、灾害、关税、制裁等真正影响全球局势的新闻。",
  buzz: "合并公开热榜和讨论强度，既看“哪里热”，也看“为什么讨论激烈”。这部分代表传播热度，不等同于事实重要性。",
  tech: "来自 IT之家、钛媒体、财联社和平台科技话题，覆盖 AI、智能车、芯片、社交产品和硬件供应链。",
  finance: "为投资者提炼今天的市场变量：A股、港股、美股、能源、汇率、贵金属、半导体和汽车出口。仅作信息梳理，不构成投资建议。"
};

const date = getRawMatch(/<time class="cover-date" datetime="([^"]+)"/, html, "2026-07-08");
const weatherGrid = getRawMatch(/<div class="cover-weather-grid" aria-label="天气细节">([\s\S]*?)<\/div>\s*<div class="weather-illustration"/, html);
const weather = {
  label: "今日天气参考",
  condition: getMatch(/<div class="cover-temp">[\s\S]*?<span>([\s\S]*?)<\/span>/, html, "待更新"),
  temperatureC: Number(getRawMatch(/<div class="cover-temp">[\s\S]*?<strong>(-?\d+)°C<\/strong>/, html, "0")),
  feelsLikeC: Number(getRawMatch(/体感\s*(-?\d+)°C/, weatherGrid, "0")),
  humidity: getMatch(/湿度\s*([^<\n]+)/, weatherGrid, "待更新"),
  wind: getMatch(/<div class="cover-weather-item"><span>(?:Wind|风力情况)<\/span>([\s\S]*?)<\/div>/, weatherGrid, "待更新")
};

for (const sectionMatch of html.matchAll(sectionPattern)) {
  const [, className, id, sectionHtml] = sectionMatch;
  const title = getMatch(/<h2>([\s\S]*?)<\/h2>/, sectionHtml);
  const kicker = getMatch(/<div class="section-kicker">([\s\S]*?)<\/div>/, sectionHtml);
  const note = getMatch(/<p class="section-note">([\s\S]*?)<\/p>/, sectionHtml, sectionNotes[id]);
  const itemPattern = /<article class="card">([\s\S]*?)<\/article>/g;
  const items = [];

  for (const itemMatch of sectionHtml.matchAll(itemPattern)) {
    const itemHtml = itemMatch[1];
    const rank = Number(getMatch(/<div class="num">([\s\S]*?)<\/div>/, itemHtml));
    const title = getMatch(/<h3>([\s\S]*?)<\/h3>/, itemHtml);
    const summary = getMatch(/<p>([\s\S]*?)<\/p>/, itemHtml);
    const sources = [];
    const sourcePattern = /<a class="source" href="([^"]+)">([\s\S]*?)<\/a>/g;

    for (const sourceMatch of itemHtml.matchAll(sourcePattern)) {
      sources.push({
        name: stripTags(sourceMatch[2]),
        url: decodeHtml(sourceMatch[1]),
        type: id === "buzz" ? "platform" : id === "finance" ? "market" : id === "world" ? "media" : "official"
      });
    }

    const item = {
      id: `${id}-${String(rank).padStart(2, "0")}`,
      rank,
      title,
      summary,
      whyItMatters: "",
      tags: [],
      sources
    };
    item.whyItMatters = getWhyItMatters(id, item);
    item.tags = getTags(id, item);
    items.push(item);
  }

  sections.push({
    id,
    className,
    title,
    kicker,
    note,
    items
  });
}

const issue = {
  date,
  publishedAt: `${date}T08:00:00+08:00`,
  updatedAt: `${date}T07:50:00+08:00`,
  timezone: "Asia/Shanghai",
  weather,
  mustRead: sections.map((section) => `${section.id}-01`),
  sections
};

fs.mkdirSync(path.join("data", "daily"), { recursive: true });
fs.writeFileSync(path.join("data", "daily", `${date}.json`), `${JSON.stringify(issue, null, 2)}\n`, "utf8");
console.log(`Wrote data/daily/${date}.json (${sections.reduce((sum, section) => sum + section.items.length, 0)} items)`);

const fs = require("fs");
const path = require("path");

const date = process.argv[2];

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("Usage: node scripts/draft-daily.js YYYY-MM-DD");
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getNowForIssue(date) {
  return `${date}T07:55:00+08:00`;
}

function normalizeSource(source, fallbackType) {
  return {
    name: source.name,
    url: source.url,
    type: source.type || fallbackType
  };
}

function whyItMatters(section, item, rank) {
  if (item.whyItMatters) return item.whyItMatters;

  const base = {
    official: "这条信息来自官方或权威渠道，关系到政策方向、公共事务或民生安排，适合作为当天国内判断的基础。",
    world: "这条国际信息会影响地区安全、外交关系或全球市场情绪，需要结合多家来源持续观察。",
    buzz: "这条内容代表公开平台上的讨论强度和传播热度，适合了解公众今天最集中关注什么。",
    tech: "这条科技信息关系到 AI、智能汽车、芯片、硬件或平台产品的产业变化，适合跟踪科技商业趋势。",
    finance: "这条财经信息关系到市场情绪、资产价格或产业链变量，适合投资者做信息跟踪，不构成投资建议。"
  }[section.id] || "这条信息进入今日简报，说明它具备当天阅读价值。";

  return rank === 1 ? `${base}它位于本板块首条，说明今天需要优先阅读。` : base;
}

function normalizeTags(section, item, rank) {
  const base = {
    official: ["官方", "国内"],
    world: ["国际", "多源"],
    buzz: ["热榜", "讨论"],
    tech: ["科技", "产业"],
    finance: ["财经", "投资者关注"]
  }[section.id] || ["精选"];
  const tags = [...new Set([...(item.tags || base), ...(rank === 1 ? ["必看"] : [])])];
  return tags;
}

const config = readJson("config/daily-sources.json");
const candidateFile = path.join("data", "candidates", `${date}.json`);

if (!fs.existsSync(candidateFile)) {
  throw new Error(`Missing candidate file: ${candidateFile}`);
}

const candidate = readJson(candidateFile);
const weatherFile = path.join("data", "weather", `${date}.json`);
const weather = fs.existsSync(weatherFile)
  ? readJson(weatherFile)
  : candidate.weather || {
      label: "今日天气参考",
      condition: "待更新",
      temperatureC: 0,
      feelsLikeC: 0,
      humidity: "待更新",
      wind: "待更新"
    };

const candidateSections = new Map((candidate.sections || []).map((section) => [section.id, section]));

const sections = config.sections.map((sectionConfig) => {
  const candidateSection = candidateSections.get(sectionConfig.id);
  if (!candidateSection) throw new Error(`Missing candidate section: ${sectionConfig.id}`);

  const rawItems = candidateSection.items || candidateSection.candidates || [];
  if (rawItems.length < sectionConfig.minItems) {
    throw new Error(`Section ${sectionConfig.id} needs ${sectionConfig.minItems} items, found ${rawItems.length}`);
  }

  const items = rawItems.slice(0, sectionConfig.minItems).map((item, index) => {
    const rank = index + 1;
    if (!item.title || !item.summary) {
      throw new Error(`Section ${sectionConfig.id} item ${rank} needs title and summary`);
    }
    if (!Array.isArray(item.sources) || item.sources.length === 0) {
      throw new Error(`Section ${sectionConfig.id} item ${rank} needs at least one source`);
    }

    return {
      id: `${sectionConfig.id}-${String(rank).padStart(2, "0")}`,
      rank,
      title: item.title,
      summary: item.summary,
      whyItMatters: whyItMatters(sectionConfig, item, rank),
      tags: normalizeTags(sectionConfig, item, rank),
      sources: item.sources.map((source) => normalizeSource(source, sectionConfig.sourceType))
    };
  });

  return {
    id: sectionConfig.id,
    className: sectionConfig.className,
    title: sectionConfig.title,
    kicker: sectionConfig.kicker,
    note: sectionConfig.note,
    items
  };
});

const issue = {
  date,
  publishedAt: `${date}T${String(config.publishHour).padStart(2, "0")}:00:00+08:00`,
  updatedAt: candidate.collectedAt || getNowForIssue(date),
  timezone: config.timezone,
  weather,
  mustRead: sections.map((section) => `${section.id}-01`),
  sections
};

fs.mkdirSync(path.join("data", "daily"), { recursive: true });
fs.writeFileSync(path.join("data", "daily", `${date}.json`), `${JSON.stringify(issue, null, 2)}\n`, "utf8");
console.log(`Drafted data/daily/${date}.json (${sections.reduce((sum, section) => sum + section.items.length, 0)} items)`);

const fs = require("fs");
const path = require("path");

const date = process.argv[2];
const force = process.argv.includes("--force");
const allowPlaceholders = process.argv.includes("--allow-placeholders");

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("Usage: node scripts/collect-candidates.js YYYY-MM-DD [--force]");
  process.exit(1);
}

const candidateFile = path.join("data", "candidates", `${date}.json`);
const collectionLogFile = path.join("logs", `collection-${date}.json`);
const collectionRunAt = Date.now();
if (fs.existsSync(candidateFile) && !force) {
  console.log(`Candidate file exists: ${candidateFile}`);
  process.exit(0);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function decodeXml(value) {
  let text = String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let i = 0; i < 2; i += 1) {
    text = text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return decodeXml(String(value || "").replace(/<[^>]*>/g, " "));
}

function getTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function getLink(block) {
  const rssLink = getTag(block, "link");
  if (rssLink) return rssLink;
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return atom ? decodeXml(atom[1]) : "";
}

function getSource(block, fallbackName) {
  const sourceMatch = block.match(/<source(?:\s+url=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/source>/i);
  if (!sourceMatch) return { name: fallbackName, url: "" };
  return {
    url: decodeXml(sourceMatch[1] || ""),
    name: decodeXml(sourceMatch[2] || fallbackName)
  };
}

function parseFeed(xml, feedConfig) {
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)
  ].map((match) => match[0]);

  return blocks.map((block) => {
    const source = getSource(block, feedConfig.name);
    const title = decodeXml(getTag(block, "title"));
    const description = stripTags(getTag(block, "description") || getTag(block, "summary") || getTag(block, "content"));
    const pubDate = getTag(block, "pubDate") || getTag(block, "updated") || getTag(block, "published");

    return {
      section: feedConfig.section,
      sourceName: source.name || feedConfig.name,
      sourceUrl: source.url,
      sourceType: feedConfig.type,
      title,
      description,
      link: getLink(block),
      pubDate: pubDate ? new Date(pubDate).getTime() : 0
    };
  }).filter((item) => item.title && item.link);
}

function cleanTitle(title) {
  return decodeXml(title)
    .replace(/\s+-\s+[^-]{2,40}$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanDescription(description, title, sourceName) {
  const text = decodeXml(description);
  if (!text) return "";

  const source = cleanTitle(sourceName || "");
  const withoutSource = source
    ? text.replace(new RegExp(`\\s*${escapeRegExp(source)}\\s*$`, "u"), "").trim()
    : text;

  const cleanTitleText = cleanTitle(title);
  if (!withoutSource || normalizeKey(withoutSource) === normalizeKey(cleanTitleText)) return "";
  return withoutSource;
}

function normalizeKey(title) {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, "");
}

function shanghaiDateString(timestamp = collectionRunAt) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function issueWindowMs() {
  const publishAt = new Date(`${date}T08:00:00+08:00`).getTime();
  const scheduledEnd = publishAt + 30 * 60 * 1000;
  const isToday = date === shanghaiDateString();
  const end = isToday && collectionRunAt > scheduledEnd
    ? collectionRunAt + 5 * 60 * 1000
    : scheduledEnd;

  return {
    start: end - 24 * 60 * 60 * 1000,
    end
  };
}

function isInIssueWindow(item) {
  const pubDate = Number(item.pubDate || 0);
  if (!Number.isFinite(pubDate) || pubDate <= 0) return false;
  const { start, end } = issueWindowMs();
  return pubDate >= start && pubDate <= end;
}

function countMatches(text, pattern) {
  return Array.from(String(text || "").matchAll(pattern)).length;
}

function hanCount(text) {
  return countMatches(text, /\p{Script=Han}/gu);
}

function latinWordCount(text) {
  return countMatches(text, /\b[A-Za-z]{3,}\b/g);
}

function isChineseDisplayReady(item) {
  const title = cleanTitle(item.title);
  const description = cleanDescription(item.description, title, item.sourceName);
  const text = `${title} ${description}`;
  const han = hanCount(text);
  const latinWords = latinWordCount(text);
  if (han < 6) return false;
  return han >= latinWords * 2 || han >= 14;
}

const sectionSignals = {
  official: [
    "国务院", "新华社", "央视", "政策", "发布", "会议", "民政部", "国家", "全国", "防汛", "救灾", "科技奖", "规划"
  ],
  world: [
    "美国", "特朗普", "白宫", "欧盟", "俄罗斯", "乌克兰", "以色列", "伊朗", "加沙", "中东", "联合国",
    "北约", "国际", "全球", "外交", "冲突", "停火", "制裁", "关税", "大选", "地震", "洪灾", "航班", "危机"
  ],
  buzz: [
    "热搜", "热议", "网友", "争议", "爆火", "刷屏", "回应", "道歉", "直播", "短视频", "社交平台", "话题"
  ],
  tech: [
    "AI", "人工智能", "芯片", "机器人", "小米", "华为", "苹果", "iPhone", "特斯拉", "新能源车", "自动驾驶",
    "大模型", "算力", "半导体", "硬件", "发布", "系统"
  ],
  finance: [
    "A股", "港股", "美股", "人民币", "美元", "油价", "黄金", "债券", "央行", "降息", "通胀", "财报",
    "市场", "投资", "基金", "指数", "半导体", "汽车", "出口", "汇率", "期货"
  ]
};

const sectionNoise = {
  world: [
    "主力资金", "净买入", "净卖出", "股价", "个股", "证券", "概念股", "板块", "涨停", "跌停", "龙虎榜",
    "融资融券", "市值", "603", "688", "300", "000"
  ],
  official: ["主力资金", "净买入", "净卖出", "股价", "个股", "证券"],
  buzz: [],
  tech: ["主力资金", "净买入", "净卖出"],
  finance: []
};

function keywordScore(text, words) {
  return words.reduce((score, word) => score + (text.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function sourceScore(item) {
  const source = `${item.sourceName || ""} ${item.sourceUrl || ""}`.toLowerCase();
  if (/新华社|央视|人民日报|中国新闻网|财联社|it之家|钛媒体|第一财经|经济观察|澎湃/.test(source)) return 16;
  if (/google news|news\.google/.test(source)) return 12;
  if (/bbc|guardian|reuters|ap|associated press|marketwatch|dow jones|bloomberg/.test(source)) return 8;
  if (/新浪|网易|搜狐|腾讯|东方财富|证券时报/.test(source)) return 6;
  return 3;
}

function sectionRelevanceScore(sectionId, item) {
  const title = cleanTitle(item.title);
  const description = cleanDescription(item.description, title, item.sourceName);
  const text = `${title} ${description} ${item.sourceName || ""}`.toLowerCase();
  const signal = keywordScore(text, sectionSignals[sectionId] || []);
  const noise = keywordScore(text, sectionNoise[sectionId] || []);
  const titleLengthBonus = title.length >= 10 && title.length <= 42 ? 4 : 0;
  const chineseBonus = Math.min(10, Math.floor(hanCount(`${title} ${description}`) / 6));
  return signal * 10 + sourceScore(item) + titleLengthBonus + chineseBonus - noise * 18;
}

function recencyScore(item) {
  const pubDate = Number(item.pubDate || 0);
  if (!pubDate) return 0;
  const { end } = issueWindowMs();
  const hoursOld = Math.max(0, (end - pubDate) / (60 * 60 * 1000));
  return Math.max(0, 18 - Math.floor(hoursOld / 2));
}

function topTenScore(sectionId, item) {
  return sectionRelevanceScore(sectionId, item) + recencyScore(item);
}

function isRelevantToSection(sectionId, item) {
  if (!isInIssueWindow(item)) return false;
  if (!isChineseDisplayReady(item)) return false;
  const score = sectionRelevanceScore(sectionId, item);
  if (sectionId === "world") return score >= 20;
  if (sectionId === "finance") return score >= 18;
  if (sectionId === "tech") return score >= 18;
  return score >= 14;
}

function summaryFor(sectionId, item) {
  const title = cleanTitle(item.title);
  const description = cleanDescription(item.description, title, item.sourceName);
  if (description) return description.slice(0, 120);

  const templates = {
    official: `官方与权威媒体关注“${title}”，适合作为今天国内公共事务判断的基础。`,
    world: `国际媒体关注“${title}”，需结合多家来源观察后续影响。`,
    buzz: `“${title}”进入公开信息流，反映今天较高的讨论热度。`,
    tech: `科技圈关注“${title}”，可能影响 AI、硬件、平台或智能汽车相关判断。`,
    finance: `市场关注“${title}”，投资者可跟踪其对风险偏好、板块轮动或资产价格的影响。`
  };
  return templates[sectionId] || `今天值得关注：“${title}”。`;
}

function detailSummaryFor(sectionId, item) {
  const title = cleanTitle(item.title);
  const description = cleanDescription(item.description, title, item.sourceName);
  if (!description) return "";
  return description.length > 320 ? `${description.slice(0, 318)}...` : description;
}

function whyItMatters(sectionId) {
  const reasons = {
    official: "这条信息来自官方或权威渠道，关系到政策方向、公共事务或民生安排，适合作为当天国内判断的基础。",
    world: "这条国际信息可能影响地区安全、外交关系或全球市场情绪，需要结合多家来源持续观察。",
    buzz: "这条内容代表公开平台上的讨论强度和传播热度，适合了解公众今天最集中关注什么。",
    tech: "这条科技信息关系到 AI、智能汽车、芯片、硬件或平台产品的产业变化，适合跟踪科技商业趋势。",
    finance: "这条财经信息关系到市场情绪、资产价格或产业链变量，适合投资者做信息跟踪，不构成投资建议。"
  };
  return reasons[sectionId] || "这条信息进入今日简报，说明它具备当天阅读价值。";
}

function tagsFor(sectionId) {
  return {
    official: ["官方", "国内"],
    world: ["国际", "多源"],
    buzz: ["热榜", "讨论"],
    tech: ["科技", "产业"],
    finance: ["财经", "投资者关注"]
  }[sectionId] || ["精选"];
}

function weatherCodeToText(code) {
  if ([0].includes(code)) return "晴";
  if ([1, 2, 3].includes(code)) return "多云";
  if ([45, 48].includes(code)) return "雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气变化";
}

async function fetchTextOnce(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "DailyHeadlinesBot/1.0 (+https://github.com/)"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchTextOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw lastError;
}

async function collectFeed(feed) {
  const startedAt = new Date().toISOString();
  try {
    const xml = await fetchText(feed.url);
    const items = parseFeed(xml, feed);
    return {
      ok: true,
      feed: feed.name,
      section: feed.section,
      itemCount: items.length,
      startedAt,
      finishedAt: new Date().toISOString(),
      items
    };
  } catch (error) {
    return {
      ok: false,
      feed: feed.name,
      section: feed.section,
      error: error.name === "AbortError" ? "timeout after 12000ms" : error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      items: []
    };
  }
}

async function collectWeather(config) {
  const weather = config.weather;
  const params = new URLSearchParams({
    latitude: String(weather.latitude),
    longitude: String(weather.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m",
    timezone: weather.timezone || "Asia/Shanghai"
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  let weatherData;
  try {
    const data = JSON.parse(await fetchText(url));
    const current = data.current || {};
    weatherData = {
      label: weather.label || "今日天气参考",
      condition: weatherCodeToText(Number(current.weather_code)),
      temperatureC: Math.round(Number(current.temperature_2m)),
      feelsLikeC: Math.round(Number(current.apparent_temperature)),
      humidity: `${Math.round(Number(current.relative_humidity_2m))}%`,
      wind: `${Math.round(Number(current.wind_speed_10m))} km/h`
    };
  } catch (error) {
    weatherData = {
      label: weather.label || "今日天气参考",
      condition: "待更新",
      temperatureC: 0,
      feelsLikeC: 0,
      humidity: "待更新",
      wind: "待更新"
    };
  }
  fs.mkdirSync(path.join("data", "weather"), { recursive: true });
  fs.writeFileSync(path.join("data", "weather", `${date}.json`), `${JSON.stringify(weatherData, null, 2)}\n`, "utf8");
  return weatherData;
}

function fallbackItem(section, index, errors) {
  const title = `${section.title.replace(/\s*10\s*条$/, "")}候选 ${index + 1} 待复核`;
  return {
    title,
    summary: "自动采集源暂时不足，这条为占位候选，需要人工补充真实新闻后再发布给读者。",
    whyItMatters: "自动采集不足时保留占位，避免系统误把旧内容当作新内容发布。正式发布前应替换为真实新闻。",
    tags: [...tagsFor(section.id), "待复核"],
    sources: [
      {
        name: "自动采集日志",
        url: "https://github.com/",
        type: section.sourceType
      }
    ],
    collectionWarnings: errors
  };
}

function writeCollectionLog(feedResults, sectionCounts, status, message = "") {
  fs.mkdirSync("logs", { recursive: true });
  fs.writeFileSync(collectionLogFile, `${JSON.stringify({
    date,
    status,
    message,
    allowPlaceholders,
    feedResults: feedResults.map(({ items, ...result }) => result),
    sectionCounts
  }, null, 2)}\n`, "utf8");
}

function printCollectionSummary() {
  if (!fs.existsSync(collectionLogFile)) return;

  try {
    const log = readJson(collectionLogFile);
    console.error(`Collection ${log.status}: ${log.message || "no message"}`);
    for (const count of log.sectionCounts || []) {
      console.error(
        `Section ${count.id}: selected ${count.count}/${count.required}, source=${count.sourceItems || 0}, fresh=${count.freshItems || 0}, relevant=${count.relevantItems || 0}`
      );
    }
    const failedFeeds = (log.feedResults || []).filter((result) => !result.ok);
    if (failedFeeds.length) {
      console.error("Failed feeds:");
      for (const feed of failedFeeds) {
        console.error(`- ${feed.section}/${feed.feed}: ${feed.error}`);
      }
    }
  } catch (error) {
    console.error(`Could not print collection log: ${error.message}`);
  }
}

async function main() {
  const sourceConfig = readJson("config/source-feeds.json");
  const dailyConfig = readJson("config/daily-sources.json");
  const feedResults = await Promise.all(sourceConfig.feeds.map((feed) => collectFeed(feed)));
  const allItems = feedResults.flatMap((result) => result.items);
  const errors = feedResults
    .filter((result) => !result.ok)
    .map((result) => `${result.feed}: ${result.error}`);

  const sectionCounts = [];
  const sectionFailures = [];
  const sections = dailyConfig.sections.map((section) => {
    const seen = new Set();
    const sectionPool = allItems.filter((item) => item.section === section.id);
    const freshPool = sectionPool.filter(isInIssueWindow);
    const relevantPool = sectionPool
      .filter((item) => isRelevantToSection(section.id, item))
      .map((item) => ({
        ...item,
        relevanceScore: sectionRelevanceScore(section.id, item),
        topTenScore: topTenScore(section.id, item)
      }));
    const items = relevantPool
      .sort((a, b) => b.topTenScore - a.topTenScore || b.relevanceScore - a.relevanceScore || b.pubDate - a.pubDate)
      .filter((item) => {
        const key = normalizeKey(item.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, section.minItems)
      .map((item) => ({
        title: cleanTitle(item.title),
        summary: summaryFor(section.id, item),
        detailSummary: detailSummaryFor(section.id, item),
        whyItMatters: whyItMatters(section.id),
        tags: tagsFor(section.id),
        sources: [
          {
            name: item.sourceName || section.sourceNames[0],
            url: item.link,
            type: item.sourceType || section.sourceType
          }
        ],
        collectionScore: item.topTenScore
      }));

    sectionCounts.push({
      id: section.id,
      count: items.length,
      required: section.minItems,
      sourceItems: sectionPool.length,
      freshItems: freshPool.length,
      relevantItems: relevantPool.length
    });

    if (items.length < section.minItems && !allowPlaceholders) {
      const sectionFeeds = feedResults
        .filter((result) => result.section === section.id)
        .map((result) => `${result.feed}=${result.ok ? result.itemCount : result.error}`)
        .join("; ");
      const message = `Section ${section.id} needs ${section.minItems} same-day Top 10 items, selected ${items.length} from ${freshPool.length} fresh items and ${relevantPool.length} relevant Chinese-display items`;
      sectionFailures.push(`${message}. Feeds: ${sectionFeeds}`);
    }

    while (allowPlaceholders && items.length < section.minItems) {
      items.push(fallbackItem(section, items.length, errors));
    }

    return { id: section.id, items };
  });

  if (sectionFailures.length && !allowPlaceholders) {
    const message = sectionFailures.join(" | ");
    writeCollectionLog(feedResults, sectionCounts, "failed", message);
    throw new Error(message);
  }

  const weather = await collectWeather(sourceConfig);
  const candidate = {
    date,
    collectedAt: new Date(collectionRunAt).toISOString(),
    weather,
    sections
  };

  fs.mkdirSync(path.join("data", "candidates"), { recursive: true });
  fs.writeFileSync(candidateFile, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  writeCollectionLog(feedResults, candidate.sections.map((section) => ({
    id: section.id,
    count: section.items.length,
    required: dailyConfig.sections.find((configSection) => configSection.id === section.id)?.minItems || section.items.length
  })), "success");
  console.log(`Collected ${candidateFile}`);
  console.log(candidate.sections.map((section) => `${section.id}: ${section.items.length}`).join("\n"));
  if (errors.length) console.warn(`Feed warnings: ${errors.join("; ")}`);
}

main().catch((error) => {
  printCollectionSummary();
  console.error(error.message);
  process.exit(1);
});

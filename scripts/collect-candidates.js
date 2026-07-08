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
if (fs.existsSync(candidateFile) && !force) {
  console.log(`Candidate file exists: ${candidateFile}`);
  process.exit(0);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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
  return title
    .replace(/\s+-\s+[^-]{2,40}$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(title) {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, "");
}

function summaryFor(sectionId, item) {
  const title = cleanTitle(item.title);
  const description = item.description && item.description.length > 16 ? item.description : "";
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

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
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

async function main() {
  const sourceConfig = readJson("config/source-feeds.json");
  const dailyConfig = readJson("config/daily-sources.json");
  const feedResults = await Promise.all(sourceConfig.feeds.map((feed) => collectFeed(feed)));
  const allItems = feedResults.flatMap((result) => result.items);
  const errors = feedResults
    .filter((result) => !result.ok)
    .map((result) => `${result.feed}: ${result.error}`);

  const sectionCounts = [];
  const sections = dailyConfig.sections.map((section) => {
    const seen = new Set();
    const items = allItems
      .filter((item) => item.section === section.id)
      .sort((a, b) => b.pubDate - a.pubDate)
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
        whyItMatters: whyItMatters(section.id),
        tags: tagsFor(section.id),
        sources: [
          {
            name: item.sourceName || section.sourceNames[0],
            url: item.link,
            type: item.sourceType || section.sourceType
          }
        ]
      }));

    sectionCounts.push({
      id: section.id,
      count: items.length,
      required: section.minItems
    });

    if (items.length < section.minItems && !allowPlaceholders) {
      const sectionFeeds = feedResults
        .filter((result) => result.section === section.id)
        .map((result) => `${result.feed}=${result.ok ? result.itemCount : result.error}`)
        .join("; ");
      writeCollectionLog(feedResults, sectionCounts, "failed", `Section ${section.id} needs ${section.minItems} items, collected ${items.length}`);
      throw new Error(`Section ${section.id} needs ${section.minItems} items, collected ${items.length}. Feeds: ${sectionFeeds}`);
    }

    while (allowPlaceholders && items.length < section.minItems) {
      items.push(fallbackItem(section, items.length, errors));
    }

    return { id: section.id, items };
  });

  const weather = await collectWeather(sourceConfig);
  const candidate = {
    date,
    collectedAt: `${date}T07:50:00+08:00`,
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
  console.error(error.message);
  process.exit(1);
});

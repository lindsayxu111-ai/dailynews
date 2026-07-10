const fs = require("fs");

const issueFile = process.argv[2];
const defaultBaseUrl = "https://lindsayxu111-ai.github.io/dailynews/";
const pushplusUrl = "https://www.pushplus.plus/send";

if (!issueFile) {
  console.error("Usage: node scripts/send-pushplus.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

function cleanText(value) {
  return String(value || "")
    .replace(/&(?:amp;)?nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatChineseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function normalizeBaseUrl(value) {
  const baseUrl = cleanText(value) || defaultBaseUrl;
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function sectionTitle(value) {
  return cleanText(value).replace(/\s*10\s*条$/, "");
}

function renderContent(issue, baseUrl) {
  const weather = issue.weather || {};
  const weatherLine = [
    cleanText(weather.label) || "今日天气参考",
    "：",
    cleanText(weather.condition) || "暂无",
    weather.temperatureC === undefined ? "" : `，${weather.temperatureC}°C`,
    weather.feelsLikeC === undefined ? "" : `，体感${weather.feelsLikeC}°C`,
    cleanText(weather.humidity) ? `，湿度${cleanText(weather.humidity)}` : "",
    cleanText(weather.wind) ? `，${cleanText(weather.wind)}` : "",
    "。"
  ].join("");

  const highlights = (issue.sections || [])
    .slice(0, 5)
    .map((section, index) => {
      const first = (section.items || [])[0];
      const summary = first ? cleanText(first.summary || first.title) : "暂无重点";
      return `${index + 1}. **${sectionTitle(section.title)}**：${summary}`;
    });

  return [
    `## 每日十条｜${formatChineseDate(issue.date)}`,
    "",
    weatherLine,
    "",
    "今天先看这五条线：",
    "",
    ...highlights,
    "",
    `[点击阅读完整日报](${baseUrl})`,
    "",
    `[查看今日归档](${baseUrl}daily/${issue.date}.html)`
  ].join("\n");
}

async function sendPushPlus(payload) {
  const response = await fetch(pushplusUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!response.ok || (body && body.code !== 200)) {
    console.warn(`PushPlus warning: request did not succeed. HTTP ${response.status}. Response: ${text}`);
    return;
  }

  console.log("PushPlus message sent.");
}

async function main() {
  const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
  const token = cleanText(process.env.PUSHPLUS_TOKEN);
  const topic = cleanText(process.env.PUSHPLUS_TOPIC);
  const baseUrl = normalizeBaseUrl(process.env.PUBLISH_BASE_URL);
  const title = `每日十条｜${formatChineseDate(issue.date)}`;
  const content = renderContent(issue, baseUrl);
  const payload = {
    token,
    title,
    content,
    template: "markdown"
  };

  if (topic) payload.topic = topic;

  if (!token) {
    console.warn("PUSHPLUS_TOKEN is not configured; skipping PushPlus send.");
    return;
  }

  if (process.env.PUSHPLUS_DRY_RUN === "1") {
    console.log("DRY RUN: PushPlus payload");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    await sendPushPlus(payload);
  } catch (error) {
    console.warn(`PushPlus warning: ${error.message}`);
  }
}

main();

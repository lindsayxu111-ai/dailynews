const fs = require("fs");

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/generate-wechat.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(file, "utf8"));

function formatChineseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

const weather = issue.weather;
const lines = [
  `【每日头条｜${formatChineseDate(issue.date)}】`,
  `${weather.label}：${weather.condition}，${weather.temperatureC}°C，体感${weather.feelsLikeC}°C，湿度${weather.humidity}，${weather.wind}。`,
  "今天重点看五条线：防汛救灾、国际冲突、全网热议、科技圈、财经市场。",
  ""
];

const sectionNumbers = ["一", "二", "三", "四", "五", "六", "七"];

issue.sections.forEach((section, index) => {
  lines.push(`${sectionNumbers[index]}、${section.title.replace(/\s*10\s*条$/, "")}`);
  section.items.forEach((item, itemIndex) => {
    lines.push(`${itemIndex + 1}. ${item.summary}`);
  });
  lines.push("");
});

lines.push("提示：全网热议代表公开平台热度和讨论强度，不等同于事实重要性；财经内容仅作信息梳理，不构成投资建议；涉灾、市场和国际冲突信息请继续关注权威更新。");

const out = `wechat-digest-${issue.date}.txt`;
fs.writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${out}`);

const fs = require("fs");
const { spawnSync } = require("child_process");

function todayInShanghai() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

const date = process.argv[2] || todayInShanghai();
const candidateFile = `data/candidates/${date}.json`;

if (!fs.existsSync(candidateFile)) {
  fs.mkdirSync("logs", { recursive: true });
  const message = [
    `# ${date} 日报未发布`,
    "",
    `缺少候选新闻文件：\`${candidateFile}\`。`,
    "",
    "为避免发布空内容或旧内容，流水线已停止，`index.html` 没有被覆盖。",
    "",
    "处理方式：补齐当天候选新闻后运行：",
    "",
    `\`\`\`bash`,
    `node scripts/run-daily-pipeline.js ${date}`,
    `\`\`\``,
    ""
  ].join("\n");
  fs.writeFileSync(`logs/missing-candidates-${date}.md`, message, "utf8");
  console.error(`Missing candidate file: ${candidateFile}`);
  process.exit(1);
}

const result = spawnSync("node", ["scripts/run-daily-pipeline.js", date], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit"
});

process.exit(result.status ?? 1);

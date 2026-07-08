const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const date = process.argv[2];

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("Usage: node scripts/run-daily-pipeline.js YYYY-MM-DD");
  process.exit(1);
}

function run(command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  const finishedAt = new Date().toISOString();
  const record = {
    command: [command, ...args].join(" "),
    status: result.status,
    startedAt,
    finishedAt,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };

  if (result.status !== 0) {
    const message = record.stderr || record.stdout || `Command failed: ${record.command}`;
    throw Object.assign(new Error(message), { record });
  }

  return record;
}

const steps = [
  ["node", ["scripts/draft-daily.js", date]],
  ["node", ["scripts/validate-daily.js", `data/daily/${date}.json`]],
  ["node", ["scripts/generate-wechat.js", `data/daily/${date}.json`]],
  ["node", ["scripts/build-daily.js", `data/daily/${date}.json`]]
];

const log = {
  date,
  status: "started",
  startedAt: new Date().toISOString(),
  steps: []
};

try {
  for (const [command, args] of steps) {
    const record = run(command, args);
    log.steps.push(record);
    console.log(record.stdout);
  }
  log.status = "success";
  log.finishedAt = new Date().toISOString();
} catch (error) {
  log.status = "failed";
  log.finishedAt = new Date().toISOString();
  if (error.record) log.steps.push(error.record);
  fs.mkdirSync("logs", { recursive: true });
  fs.writeFileSync(path.join("logs", `pipeline-${date}.json`), `${JSON.stringify(log, null, 2)}\n`, "utf8");
  console.error(error.message);
  process.exit(1);
}

fs.mkdirSync("logs", { recursive: true });
fs.writeFileSync(path.join("logs", `pipeline-${date}.json`), `${JSON.stringify(log, null, 2)}\n`, "utf8");
console.log(`Pipeline complete: ${date}`);

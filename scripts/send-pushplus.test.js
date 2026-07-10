const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const issueFile = "data/daily/2026-07-09.json";

function runSender(env = {}) {
  return spawnSync(process.execPath, ["scripts/send-pushplus.js", issueFile], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PUSHPLUS_TOKEN: "",
      PUSHPLUS_TOPIC: "",
      PUSHPLUS_DRY_RUN: "",
      ...env
    }
  });
}

test("dry run prints a short PushPlus card without sending", () => {
  const result = runSender({
    PUSHPLUS_TOKEN: "test-token",
    PUSHPLUS_TOPIC: "dailynews",
    PUSHPLUS_DRY_RUN: "1"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /DRY RUN/);
  assert.match(result.stdout, /每日十条｜2026年7月9日/);
  assert.match(result.stdout, /完整日报/);
  assert.match(result.stdout, /https:\/\/lindsayxu111-ai\.github\.io\/dailynews\//);
  assert.match(result.stdout, /daily\/2026-07-09\.html/);
});

test("missing PushPlus token skips sending without failing deployment", () => {
  const result = runSender();
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /PUSHPLUS_TOKEN is not configured/);
});

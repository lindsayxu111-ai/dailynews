# 本地每天 8 点自动运行

当前项目已经有每日流水线入口：

```bash
cd /Users/lindsay/Desktop/每日头条
node scripts/run-today-pipeline.js
```

## macOS 定时方案

可以用 `launchd` 每天早晨 8 点运行这条命令。建议等真实抓取或候选新闻准备流程稳定后再启用。

配置思路：

- 运行时间：每天 08:00
- 工作目录：`/Users/lindsay/Desktop/每日头条`
- 命令：`node scripts/run-today-pipeline.js`
- 日志目录：`logs/`

## 启用前检查

每天 8 点前必须存在：

```text
data/candidates/YYYY-MM-DD.json
```

如果候选文件不存在，脚本会停止，不覆盖 `index.html`，并写入：

```text
logs/missing-candidates-YYYY-MM-DD.md
```

## 推荐节奏

第一阶段先手动运行：

```bash
node scripts/run-daily-pipeline.js YYYY-MM-DD
```

第二阶段接入抓取脚本，自动生成候选文件。

第三阶段再开启每天 8 点定时任务。

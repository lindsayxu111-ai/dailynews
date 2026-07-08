# 每日 8 点更新流程

## 时间表

- 07:30 抓取候选新闻。
- 07:40 去重和合并同类新闻。
- 07:45 检查来源和原出处链接。
- 07:50 生成摘要、今日必看和微信版。
- 07:55 人工快速审核。
- 08:00 发布当天日报。

## 发布产物

- `data/daily/YYYY-MM-DD.json`
- `daily/YYYY-MM-DD.html`
- `news/YYYY-MM-DD/*.html`
- `wechat-digest-YYYY-MM-DD.txt`
- `index.html`
- `archive.html`

## 手动发布命令

```bash
node scripts/run-daily-pipeline.js YYYY-MM-DD
```

这条命令会自动执行：

1. 从 `data/candidates/YYYY-MM-DD.json` 生成 `data/daily/YYYY-MM-DD.json`
2. 校验 5 个板块、50 条新闻和来源链接
3. 生成微信分享版
4. 构建首页、归档页和 50 个详情页
5. 写入 `logs/pipeline-YYYY-MM-DD.json`

如果要让脚本自动使用当天日期：

```bash
node scripts/run-today-pipeline.js
```

## 失败策略

- 抓取失败：保留昨日版本，显示更新延迟。
- 单一来源：标记单来源待复核，优先补充第二来源。
- 发布失败：不覆盖线上最新稳定页面。
- 财经内容：保留“信息梳理，不构成投资建议”的提示。
- 平台热榜：标记为讨论热度，不等同于事实重要性。

## 后续自动化方向

- 云端推荐使用 GitHub Pages + GitHub Actions，每天北京时间 08:00 自动运行 `.github/workflows/daily-pages.yml`。
- 增加人工审核开关，审核通过后才覆盖 `index.html`。
- 记录每条新闻的来源时间、抓取时间和编辑时间。
- 为微信推送增加固定模板，便于直接复制或接入自动发送工具。

## 当前自动化边界

现在已经具备从候选新闻到正式页面的一键构建能力。真实抓取仍建议单独接入，原因是不同平台的热榜接口、反爬策略和授权条件不同，不能把它们混进发布脚本里。后续可以为每个平台增加独立抓取适配器，统一输出到 `data/candidates/YYYY-MM-DD.json`。

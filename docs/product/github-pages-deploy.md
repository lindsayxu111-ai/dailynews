# GitHub Pages 云端部署

这个项目推荐部署到 GitHub Pages，并用 GitHub Actions 在云端每天 8 点自动构建。你的电脑不需要开机，也不会占用你的本地内存或 CPU。

## 已经准备好的文件

- `.github/workflows/daily-pages.yml`：push 到 `main` 时自动发布，也会每天北京时间 08:00 自动构建并发布。
- `scripts/prepare-pages-artifact.js`：只把公开网页文件打包到 `_site`，不发布脚本、候选新闻和日志。
- `scripts/collect-candidates.js`：云端构建时自动采集候选新闻和天气。
- `scripts/run-daily-pipeline.js`：云端构建时生成当天日报。

## 发布前需要做的事

1. 在 GitHub 创建一个新仓库。
2. 把本项目上传到仓库。
3. 打开仓库的 `Settings -> Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 打开 `Actions`，手动运行 `Daily Headlines Pages` 工作流测试一次。

## 每天自动更新逻辑

工作流有三种触发方式：

- 你 push 到 `main` 后自动运行。
- 每天 `00:00 UTC` 自动运行，也就是北京时间 `08:00`。
- 在 GitHub Actions 页面手动点击 `Run workflow` 运行。

运行顺序都一样：

```text
抓取公开 RSS/API 与天气
        ↓
生成 data/candidates/YYYY-MM-DD.json
        ↓
生成 data/daily/YYYY-MM-DD.json
        ↓
校验 50 条新闻和来源
        ↓
生成微信版、首页、归档页、详情页
        ↓
打包公开网页到 _site
        ↓
发布到 GitHub Pages
```

## 重要边界

当前云端定时发布已经配置好，并会先尝试自动生成当天候选新闻文件：

```text
data/candidates/YYYY-MM-DD.json
```

如果这个文件已经存在，采集脚本会直接跳过，使用你手动准备的版本。如果不存在，GitHub Actions 会通过 `config/source-feeds.json` 里的公开 RSS/API 源自动采集。

如果公开源临时不可用，工作流会失败并停止发布，避免用不完整内容覆盖网站。

## 数据源配置

自动采集源在这里维护：

```text
config/source-feeds.json
```

第一版使用无需 API key 的公开源，包括 Google News RSS、China Daily、IT之家、MarketWatch、Dow Jones、Guardian、BBC 和 Open-Meteo 天气。微博、抖音、快手等平台限制更多，后续建议作为独立适配器接入。

## 公开页面范围

GitHub Pages 只会发布：

- `index.html`
- `archive.html`
- `assets/`
- `daily/`
- `news/`
- `wechat-digest-YYYY-MM-DD.txt`

不会发布：

- `scripts/`
- `config/`
- `logs/`
- `data/candidates/`
- `data/weather/`
- `admin.html`

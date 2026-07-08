# GitHub Pages 云端部署

这个项目推荐部署到 GitHub Pages，并用 GitHub Actions 在云端每天 8 点自动构建。你的电脑不需要开机，也不会占用你的本地内存或 CPU。

## 已经准备好的文件

- `.github/workflows/daily-pages.yml`：每天北京时间 08:00 自动构建并发布。
- `scripts/prepare-pages-artifact.js`：只把公开网页文件打包到 `_site`，不发布脚本、候选新闻和日志。
- `scripts/run-daily-pipeline.js`：云端构建时生成当天日报。

## 发布前需要做的事

1. 在 GitHub 创建一个新仓库。
2. 把本项目上传到仓库。
3. 打开仓库的 `Settings -> Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 打开 `Actions`，手动运行 `Daily Headlines Pages` 工作流测试一次。

## 每天自动更新逻辑

工作流每天 `00:00 UTC` 运行，也就是北京时间 `08:00`。

运行顺序：

```text
读取 data/candidates/YYYY-MM-DD.json
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

当前云端定时发布已经配置好，但每天仍需要有当天候选新闻文件：

```text
data/candidates/YYYY-MM-DD.json
```

如果当天候选文件不存在，工作流会失败并停止发布，避免用旧内容覆盖网站。下一步要做的是接入真实新闻抓取，让云端在 8 点前自动生成这个候选文件。

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

# PushPlus 微信每日提醒

本项目可以在每天北京时间 08:00 发布网页后，通过 PushPlus 给你和订阅同一主题的朋友发送一条微信提醒。你的电脑不需要开机，任务在 GitHub Actions 云端完成。

## 推送内容

微信提醒使用短卡片内容：

- 当天日期和天气参考。
- 官方、国际、全网热议、科技、财经各 1 条重点。
- 完整日报链接：`https://lindsayxu111-ai.github.io/dailynews/`
- 当日归档链接：`https://lindsayxu111-ai.github.io/dailynews/daily/YYYY-MM-DD.html`

完整 50 条内容仍在网页里阅读，避免微信消息过长被折叠或截断。

## PushPlus 设置

1. 打开 PushPlus 官网并登录。
2. 在个人资料里复制你的 `token`。
3. 创建一个主题，复制主题编码 `topic`。
4. 把主题订阅入口发给朋友，让他们订阅同一个主题。

## GitHub 设置

打开仓库的 `Settings -> Secrets and variables -> Actions`。

在 `Secrets` 里新增：

```text
PUSHPLUS_TOKEN=你的 PushPlus token
PUSHPLUS_TOPIC=你的 PushPlus topic
```

`PUSHPLUS_TOPIC` 也可以放在 `Variables` 里；如果 Secrets 和 Variables 都设置了，Secrets 优先。

## 自动推送逻辑

`.github/workflows/daily-pages.yml` 已经包含推送步骤：

```text
每天 08:00 生成日报
        ↓
发布 GitHub Pages
        ↓
发送 PushPlus 微信提醒
```

如果没有配置 `PUSHPLUS_TOKEN`，或 PushPlus 临时失败，workflow 会记录 warning，但不会阻断网站发布。

## 本地 dry run 测试

这个命令只打印将要发送的内容，不会真实推送：

```bash
PUSHPLUS_DRY_RUN=1 PUSHPLUS_TOKEN=test PUSHPLUS_TOPIC=dailynews node scripts/send-pushplus.js data/daily/2026-07-09.json
```

## GitHub 手动测试

1. 打开 GitHub 仓库的 `Actions`。
2. 选择 `Daily Headlines Pages`。
3. 点击 `Run workflow`。
4. 等待 workflow 完成。
5. 检查 PushPlus/微信是否收到提醒，并点击链接确认能打开日报。

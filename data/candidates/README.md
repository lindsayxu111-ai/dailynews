# 候选新闻文件格式

每天 8 点更新前，先准备当天候选新闻文件。每个板块的 10 条都应是该板块当天最值得看的 Top 10，不是普通新闻列表。

```text
data/candidates/YYYY-MM-DD.json
```

文件结构：

```json
{
  "date": "2026-07-08",
  "collectedAt": "2026-07-08T07:55:00+08:00",
  "sections": [
    {
      "id": "official",
      "items": [
        {
          "title": "新闻标题",
          "summary": "一句话摘要。",
          "whyItMatters": "为什么重要。",
          "tags": ["官方", "国内"],
          "sources": [
            {
              "name": "新华社",
              "url": "https://www.news.cn/",
              "type": "official"
            }
          ]
        }
      ]
    }
  ]
}
```

必须包含 5 个板块，每个板块 10 条。选题口径：

- 时间窗口：以北京时间每日 08:00 版为准，优先覆盖上一个 08:00 到当天 08:00 的重点新闻。
- 中文展示：页面标题、摘要和微信分享版都应以中文呈现；英文源可以作为判断参考，但不直接裸露英文标题。
- Top 10 排序：优先选择权威来源、全网讨论度高、与板块主题强相关、对读者判断有影响的信息。
- 宁缺毋滥：如果某个板块当天没有足够高质量候选，应该让发布流程提示不足，不要用随机旧闻凑数。

5 个板块为：

- `official`
- `world`
- `buzz`
- `tech`
- `finance`

准备好后运行：

```bash
node scripts/run-daily-pipeline.js YYYY-MM-DD
```

如果想让系统自动使用当天日期：

```bash
node scripts/run-today-pipeline.js
```

## 自动采集

云端会先运行：

```bash
node scripts/collect-candidates.js YYYY-MM-DD
```

如果当天候选文件已经存在，脚本会跳过自动采集，优先使用人工准备的文件。如果不存在，会读取：

```text
config/source-feeds.json
```

并从公开 RSS/API 源自动生成候选文件。

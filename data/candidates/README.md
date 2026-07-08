# 候选新闻文件格式

每天 8 点更新前，先准备当天候选新闻文件：

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

必须包含 5 个板块，每个板块 10 条：

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

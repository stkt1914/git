# 新闻信源与采集报告

## 1. 验证环境

- 验证时间：2026-11-08 00:20 CST（2026-11-07 16:20 UTC）
- 网络环境：当前开发主机，DNS、HTTP 与 QUIC 均由本机实际发起
- 中国大陆部署说明：当前主机存在系统级网络接口，不能等同于干净的国内直连网络；正式部署后必须在目标机房重新执行验证
- 用户代理：`Zhilan-Shizheng/0.1 (+local-development)`
- 请求超时：20 秒
- 重试次数：最多 2 次，仅针对网络错误和 5xx
- 任意来源失败不会中断其他来源

## 2. 汇总

| 指标                       |                 数量 |
| -------------------------- | -------------------: |
| 候选来源总数               |                   15 |
| RSS 类型来源               |                   11 |
| 普通网页来源               |                    4 |
| RSS/Atom feed 端点         |                   14 |
| 当前可采集 RSS 来源        |                    9 |
| 当前启用来源               |                    9 |
| 采集成功来源               |                    9 |
| 采集失败来源               |                    0 |
| 因质量或条款审核暂停的来源 |                    6 |
| 已入库新闻                 |                  242 |
| 已入库媒体数               |                    9 |
| 数据库最新新闻时间         | 2026-11-07T16:09:11Z |

第一批候选中没有原生 Atom feed。采集器通过 `feedparser` 同时支持 RSS、Atom 和 RDF；Atom 解析路径已由自动化测试覆盖。

## 3. 逐源验证结果

时间均为 UTC。普通网页不按 RSS 解析，也不会在条款和页面结构审核前启用自动采集。

| 来源                          | 类型 | 地址                                                           | HTTP | 格式/解析                         | 最新新闻             | 结果                                      |
| ----------------------------- | ---- | -------------------------------------------------------------- | ---: | --------------------------------- | -------------------- | ----------------------------------------- |
| 新华网英文 RSS                | RSS  | `https://www.xinhuanet.com/english/rss/`，官方目录下 4 个 feed |  200 | RSS；2 个字段有效、2 个缺原文链接 | 2018-01-24T00:00:00Z | `stale`：内容过期，默认关闭               |
| 中国政府网英文新闻            | 网页 | `https://english.www.gov.cn/news`                              |  200 | HTML；未发现 RSS                  | 未可靠提取           | `available_webpage`：待条款与页面结构审核 |
| 中国外交部英文网站            | 网页 | `https://www.fmprc.gov.cn/mfa_eng/`                            |  200 | HTML；未发现 RSS                  | 未可靠提取           | `available_webpage`：待条款与页面结构审核 |
| 国家统计局中文最新发布        | RSS  | `https://www.stats.gov.cn/sj/zxfb/rss.xml`                     |  200 | RSS，XML 有效，500 条             | 2026-11-04T09:30:00Z | `valid`                                   |
| 国家统计局英文最新发布        | RSS  | `https://www.stats.gov.cn/english/PressRelease/rss.xml`        |  200 | RSS；XML 标签不匹配，500 条       | 2026-11-04T09:30:00Z | `invalid`：不满足 XML 解析要求，默认关闭  |
| BBC World                     | RSS  | `https://feeds.bbci.co.uk/news/world/rss.xml`                  |  200 | RSS，23 条                        | 2026-11-07T15:56:28Z | `valid`                                   |
| The Guardian World            | RSS  | `https://www.theguardian.com/world/rss`                        |  200 | RSS，45 条                        | 2026-11-07T16:06:48Z | `valid`                                   |
| Al Jazeera                    | RSS  | `https://www.aljazeera.com/xml/rss/all.xml`                    |  200 | RSS，25 条                        | 2026-11-07T16:09:11Z | `valid`                                   |
| Deutsche Welle                | RSS  | `https://rss.dw.com/xml/rss-en-all`                            |  200 | RSS，120 条                       | 2026-11-07T15:38:00Z | `valid`                                   |
| France 24                     | RSS  | `https://www.france24.com/en/rss`                              |  200 | RSS，24 条                        | 2026-11-07T15:26:49Z | `valid`                                   |
| NPR                           | RSS  | `https://feeds.npr.org/1001/rss.xml`                           |  200 | RSS，10 条                        | 2026-11-07T14:50:00Z | `valid`                                   |
| 联合国新闻（日内瓦 RSS 目录） | RSS  | `https://news.un.org/feed/subscribe/en/news/all/rss.xml`       |  200 | RSS，30 条                        | 2026-11-06T12:00:00Z | `valid`                                   |
| WTO Latest News               | RSS  | `https://www.wto.org/library/rss/latest_news_e.xml`            |  200 | RSS，10 条                        | 2026-11-06T00:00:00Z | `valid`                                   |
| World Bank News               | 网页 | `https://www.worldbank.org/en/news`                            |  200 | HTML；跳转至 `/ext/en/news`       | 未可靠提取           | `available_webpage`：待条款与页面结构审核 |
| IMF News                      | 网页 | `https://www.imf.org/en/News`                                  |  403 | HTML；访问受限                    | 未获取               | `restricted`：当前离线拒绝访问            |

## 4. 新华网 RSS 目录核实

从新华网英文官方目录中实际发现并验证了以下 feed：

- `worldrss.xml`
- `chinarss.xml`
- `businessrss.xml`
- `scirss.xml`

这些地址不是猜测值，但当前测试发现：

- world 与 china feed 的最新条目停留在 2017-2018 年，超过 30 天新鲜度阈值。
- business 与 science feed 的最新条目缺少可用原文链接。
- 因此整个 `xinhua_english` 来源被标记为 `stale` 并默认关闭，等待官方目录更新或找到可验证的新 feed。

## 5. 实际入库

本轮只采集当前启用且通过验证的 RSS 来源：

| 来源                   | 入库数量 |
| ---------------------- | -------: |
| Al Jazeera             |       25 |
| BBC World              |       23 |
| Deutsche Welle         |       40 |
| France 24              |       24 |
| The Guardian World     |       40 |
| NPR                    |       10 |
| 国家统计局中文最新发布 |       40 |
| 联合国新闻             |       30 |
| WTO Latest News        |       10 |
| **合计**               |  **242** |

至少两个不同媒体已通过真实网络采集验证，例如 BBC World 的 23 条和 The Guardian World 的 40 条。新闻正文与图片均未入库，验证记录中 `content` 和 `image_url` 为空。

## 6. 版权与采集策略

- 所有启用 RSS 来源当前只保存标题、摘要、发布时间和原文链接。
- 所有来源的 `collect_content` 均为 `false`。
- 所有来源的 `allow_html_scraping` 均为 `false`。
- 所有来源的图片使用状态默认为 `not_used`，不保存未经授权图片。
- RSS 来源条款状态为 `rss_metadata_only_pending_review`，正式公开部署前仍需逐源完成法律审核。
- 普通网页来源为 `review_required`，只有完成条款、robots 和页面结构审核后才能编写并启用独立适配器。
- 不使用登录、付费墙、验证码绕过、第三方镜像或未经授权代理。

## 7. 运行与复验

```powershell
# 验证全部来源
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python.exe -m app.cli validate --all

# 采集全部当前启用来源
.\.venv\Scripts\python.exe -m app.cli collect --all

# 采集单个来源
.\.venv\Scripts\python.exe -m app.cli collect bbc_world
```

也可以通过 API：

- `POST /api/v1/sources/{source_id}/validate`
- `POST /api/v1/sources/{source_id}/collect`
- `POST /api/v1/collection/run`

## 8. 未解决事项

- 需要在正式中国大陆部署网络中重新测试全部海外 feed。
- 需要完成逐源条款、版权、robots 和再分发许可审核。
- 新华网 RSS 目录目前内容过期，不能作为实时新闻来源。
- 国家统计局英文 RSS 当前 XML 格式错误。
- IMF 当前返回 403。
- 中国政府网、外交部、世界银行和 IMF 尚无已审核的自动采集适配器。

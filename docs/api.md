# API 规范

## 1. 基本约定

- 基础路径：`/api/v1`
- 数据格式：`application/json`
- 字符编码：UTF-8
- 字段命名：`snake_case`
- 时间格式：RFC 3339 / ISO 8601，统一使用 UTC，例如 `2026-11-07T08:30:00Z`
- 资源标识：对外使用字符串 ID；具体是否为 UUID 由数据模型阶段确定
- 鉴权：当前无鉴权，信源管理和采集写接口只允许在本地或受信网络使用。公网部署前必须增加鉴权；后续使用 `Authorization: Bearer <token>`，不在 URL 中传递令牌
- 跨域：开发环境默认允许 `http://localhost:3000`，通过 `API_CORS_ORIGINS` 配置

当前已实现健康检查、新闻来源管理、来源验证、采集运行、采集日志和已采集新闻查询。事件聚合、跨媒体报道匹配和完整来源追溯仍属于后续阶段。

## 2. 请求与响应

### 2.1 成功响应

单个资源直接返回资源对象。列表统一使用分页对象：

```json
{
  "items": [],
  "next_cursor": null
}
```

分页参数：

| 参数     | 类型    | 默认值 | 说明                 |
| -------- | ------- | ------ | -------------------- |
| `cursor` | string  | 无     | 上一页返回的游标     |
| `limit`  | integer | 20     | 每页数量，范围 1-100 |

不透明游标由后端生成，前端不得解析内部结构。

### 2.2 错误响应

所有非 2xx 响应使用统一结构：

```json
{
  "error": {
    "code": "invalid_parameter",
    "message": "limit must be between 1 and 100",
    "details": {}
  }
}
```

常用状态码：

| 状态码 | 用途                     |
| ------ | ------------------------ |
| `400`  | 参数组合无效             |
| `401`  | 未认证或令牌失效         |
| `403`  | 无访问权限               |
| `404`  | 资源不存在               |
| `422`  | 请求体或查询参数校验失败 |
| `429`  | 请求频率超限             |
| `500`  | 未预期的服务端错误       |

错误信息应可读，但不得暴露堆栈、数据库路径或密钥。

## 3. 已实现接口

### `GET /api/v1/health`

用途：服务健康检查。

响应示例：

```json
{
  "status": "ok",
  "service": "zhilan-api",
  "version": "0.1.0"
}
```

该接口只表示 FastAPI 进程可响应，不检查数据库、模型或采集任务状态。

### `GET /api/v1/sources`

返回新闻来源配置、启用/暂停状态、RSS feed 地址、版权状态和最近检测/采集状态。

```json
{
  "items": [
    {
      "id": "bbc_world",
      "name": "BBC World",
      "publisher": "BBC",
      "source_type": "rss",
      "homepage_url": "https://www.bbc.com/news/world",
      "language": "en",
      "country_or_region": "United Kingdom",
      "default_category": "politics",
      "collection_method": "rss",
      "enabled": true,
      "paused": false,
      "feeds": [
        {
          "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
          "format": "rss",
          "category": "politics"
        }
      ],
      "terms_status": "rss_metadata_only_pending_review",
      "copyright_status": "publisher_owned_metadata_only",
      "image_usage_status": "not_used",
      "collect_content": false,
      "allow_html_scraping": false,
      "last_validation_status": "valid",
      "last_checked_at": "2026-11-07T16:20:29Z",
      "latest_item_published_at": "2026-11-07T15:56:28Z",
      "last_collected_at": "2026-11-07T16:21:10Z",
      "last_error": null
    }
  ],
  "total": 15
}
```

### `GET /api/v1/sources/status`

返回每个来源的最新端点验证状态。一个来源可以包含多个 feed。

### `POST /api/v1/sources/{source_id}/validate`

执行真实 HTTP、RSS/Atom、XML、新闻条目和字段完整性验证，并写入 `source_validations` 表。HTTP 200 不代表成功，还必须通过格式与内容检查。

返回内容包括：

- `status`：`valid`、`stale`、`invalid`、`restricted` 或 `available_webpage`
- `http_status`
- `content_type`
- `feed_format`
- `xml_valid`
- `item_count`
- `latest_published_at`
- `has_title`、`has_original_url`、`has_published_at`
- `error_message`
- `checked_at`

### `POST /api/v1/sources/{source_id}/collect`

手动采集单个来源。暂停、禁用、无 feed 或普通网页来源返回 `409`。

### `POST /api/v1/sources/{source_id}/pause`

暂停来源。暂停来源不会被定时任务或全量采集运行。

### `POST /api/v1/sources/{source_id}/resume`

恢复来源。

### `POST /api/v1/collection/run`

运行全部当前启用来源，或通过请求体指定来源：

```json
{
  "source_ids": ["bbc_world", "guardian_world"]
}
```

响应包含每次运行的 `run_id`、来源级成功/失败结果、发现条数、新增条数、更新条数和跳过条数。一个来源失败不会中断其他来源。

### `GET /api/v1/collection/logs`

查询采集日志。

查询参数：

- `source_id`：可选
- `status`：可选
- `limit`：默认 50，范围 1-200

### `GET /api/v1/news`

返回已经标准化的新闻。查询参数：

- `limit`：默认 30，范围 1-100
- `category`：可选
- `source_id`：可选
- `language`：可选

新闻字段：

```json
{
  "id": "news_xxx",
  "title": "新闻标题",
  "summary": "RSS 摘要",
  "content": null,
  "original_url": "https://publisher.example/article",
  "source_id": "bbc_world",
  "source_name": "BBC World",
  "publisher": "BBC",
  "language": "en",
  "country_or_region": "United Kingdom",
  "published_at": "2026-11-07T15:56:28Z",
  "collected_at": "2026-11-07T16:21:10Z",
  "category": "politics",
  "image_url": null,
  "collection_method": "rss",
  "content_license_status": "publisher_owned_metadata_only"
}
```

`content` 默认为 `null`，只有完成来源级版权许可后才允许存储。`image_url` 在图片授权明确前同样保持 `null`。

### `GET /api/v1/news/{news_id}`

返回单条已入库新闻。

## 4. 规划接口

以下接口用于固定前后端边界。路径和核心字段已约定，但实现阶段可以在不破坏现有字段的前提下补充字段。

### 4.1 事件列表

`GET /api/v1/events`

查询参数：

| 参数             | 类型    | 必填 | 说明                   |
| ---------------- | ------- | ---- | ---------------------- |
| `q`              | string  | 否   | 标题、摘要或实体关键词 |
| `category`       | string  | 否   | 主题分类               |
| `language`       | string  | 否   | 报道语言代码           |
| `source_id`      | string  | 否   | 限定媒体来源           |
| `published_from` | string  | 否   | 发布时间下界，RFC 3339 |
| `published_to`   | string  | 否   | 发布时间上界，RFC 3339 |
| `cursor`         | string  | 否   | 分页游标               |
| `limit`          | integer | 否   | 每页数量               |

列表项字段：

```json
{
  "id": "evt_example",
  "title": "事件标题",
  "summary": "事件摘要",
  "category": "politics",
  "first_published_at": "2026-11-07T08:30:00Z",
  "last_published_at": "2026-11-07T10:00:00Z",
  "report_count": 12,
  "source_count": 5,
  "languages": ["zh", "en"],
  "cover_image_url": null
}
```

### 4.2 事件详情

`GET /api/v1/events/{event_id}`

返回事件摘要、时间范围、分类、来源数量、报道数量和更新时间。具体报道通过独立接口读取，避免详情响应无限增大。

### 4.3 事件报道与媒体对照

`GET /api/v1/events/{event_id}/reports`

说明：返回归入该事件的报道，可按媒体、语言和发布时间筛选。每条报道至少包含：

```json
{
  "id": "rpt_example",
  "event_id": "evt_example",
  "source_id": "src_example",
  "title": "报道标题",
  "summary": "报道摘要",
  "language": "en",
  "author": "Author",
  "published_at": "2026-11-07T08:30:00Z",
  "canonical_url": "https://example.com/article",
  "media_type": "text",
  "match_confidence": 0.91
}
```

`media_type` 初期约定为 `text`，后续可扩展 `image`、`video` 或 `mixed`。

### 4.4 报道详情

`GET /api/v1/reports/{report_id}`

返回处理后的报道内容、分类、来源信息和匹配依据。不得在未授权情况下返回受限全文。

### 4.5 来源追溯

`GET /api/v1/reports/{report_id}/provenance`

返回原始 URL、媒体、作者、发布时间、采集时间、内容指纹和转载/引用关系。此接口用于回答“这条结论来自哪里”。

## 5. 前端调用规则

- 前端通过 `NEXT_PUBLIC_API_BASE_URL` 获取基础地址，不在组件中散落硬编码 URL。
- 默认使用 Next.js 同源代理 `/api/backend`，将手机端请求转发到后端 `/api/v1`。
- API 返回的字段名保持 `snake_case`；如前端需要转换命名，应在数据访问层统一处理。
- 列表响应必须支持空数组，前端不应依赖固定非空数据。
- 前端必须处理 `404`、`422`、`429` 和 `500`，并区分“暂无数据”和“请求失败”。
- 任何接口字段变更都要同步更新本文件和后端 OpenAPI 模型。

## 6. 兼容性与版本化

- 破坏性变更通过新的 `/api/v2` 提供。
- `/api/v1` 可增加可选字段，不删除既有字段，不改变字段语义。
- 新增枚举值需要同步前端容错逻辑。
- 阶段验收前不创建版本标签；接口版本号与 Git 阶段标签是两个独立概念。

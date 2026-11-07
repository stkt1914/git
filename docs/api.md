# API 规范

## 1. 基本约定

- 基础路径：`/api/v1`
- 数据格式：`application/json`
- 字符编码：UTF-8
- 字段命名：`snake_case`
- 时间格式：RFC 3339 / ISO 8601，统一使用 UTC，例如 `2026-11-07T08:30:00Z`
- 资源标识：对外使用字符串 ID；具体是否为 UUID 由数据模型阶段确定
- 鉴权：初始化阶段无鉴权。若后续引入，使用 `Authorization: Bearer <token>`，不在 URL 中传递令牌
- 跨域：开发环境默认允许 `http://localhost:3000`，通过 `API_CORS_ORIGINS` 配置

当前唯一已实现接口是 `GET /api/v1/health`。其余资源接口均为契约草案，尚未实现。

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

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `cursor` | string | 无 | 上一页返回的游标 |
| `limit` | integer | 20 | 每页数量，范围 1-100 |

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

| 状态码 | 用途 |
| --- | --- |
| `400` | 参数组合无效 |
| `401` | 未认证或令牌失效 |
| `403` | 无访问权限 |
| `404` | 资源不存在 |
| `422` | 请求体或查询参数校验失败 |
| `429` | 请求频率超限 |
| `500` | 未预期的服务端错误 |

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

## 4. 规划接口

以下接口用于固定前后端边界。路径和核心字段已约定，但实现阶段可以在不破坏现有字段的前提下补充字段。

### 4.1 事件列表

`GET /api/v1/events`

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `q` | string | 否 | 标题、摘要或实体关键词 |
| `category` | string | 否 | 主题分类 |
| `language` | string | 否 | 报道语言代码 |
| `source_id` | string | 否 | 限定媒体来源 |
| `published_from` | string | 否 | 发布时间下界，RFC 3339 |
| `published_to` | string | 否 | 发布时间上界，RFC 3339 |
| `cursor` | string | 否 | 分页游标 |
| `limit` | integer | 否 | 每页数量 |

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

### 4.6 媒体来源列表

`GET /api/v1/sources`

返回可用媒体来源、语言、地区、启用状态和最近采集时间。初始化阶段不实现任何真实来源。

## 5. 前端调用规则

- 前端通过 `NEXT_PUBLIC_API_BASE_URL` 获取基础地址，不在组件中散落硬编码 URL。
- API 返回的字段名保持 `snake_case`；如前端需要转换命名，应在数据访问层统一处理。
- 列表响应必须支持空数组，前端不应依赖固定非空数据。
- 前端必须处理 `404`、`422`、`429` 和 `500`，并区分“暂无数据”和“请求失败”。
- 任何接口字段变更都要同步更新本文件和后端 OpenAPI 模型。

## 6. 兼容性与版本化

- 破坏性变更通过新的 `/api/v2` 提供。
- `/api/v1` 可增加可选字段，不删除既有字段，不改变字段语义。
- 新增枚举值需要同步前端容错逻辑。
- 阶段验收前不创建版本标签；接口版本号与 Git 阶段标签是两个独立概念。


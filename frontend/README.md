# Frontend

Next.js、TypeScript 与 Tailwind CSS 前端工程。当前实现移动端优先的新闻情报展示系统。

## 页面

- `/`：手机预览容器，桌面端固定为 393 × 852，四周为黑色
- `/app`：实际移动端应用，包含推荐/关注、分类和事件详情
- `/sources`：信源管理手机预览容器
- `/app/sources`：信源管理页面，可采集、暂停和恢复来源
- 标题区与新闻卡片：明确标记演示数据或后端连接状态
- 事件详情：手机端可上下滑动，真实新闻来源可打开原文 URL
- 演示数据：`src/data/demo-events.ts`

页面默认通过同源 `/api/backend` 代理请求后端新闻接口。后端不可用或无新闻时回退到本地演示数据，不把 mock 内容标记为实时新闻。

环境变量：

- `NEXT_PUBLIC_API_BASE_URL=/api/backend`
- `BACKEND_INTERNAL_URL=http://127.0.0.1:8000/api/v1`

## 启动

```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

默认地址：<http://localhost:3000>

## 检查

```powershell
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
```

Playwright 使用本机 Chrome，截图输出到 `test-results/`。

# Frontend

Next.js、TypeScript 与 Tailwind CSS 前端工程。当前实现移动端优先的新闻情报展示系统。

## 页面

- `/`：手机预览容器，桌面端固定为 393 × 852，四周为黑色
- `/app`：实际移动端应用，包含推荐/关注、分类和事件详情
- 标题区与新闻卡片：明确标记演示数据或后端连接状态
- 演示数据：`src/data/demo-events.ts`

页面会优先请求 `NEXT_PUBLIC_API_BASE_URL` 指向的 `/events` 接口。接口不可用时回退到本地演示数据，不把 mock 内容标记为实时新闻。

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

# 智览时政

“智览时政”是一个面向海内外新闻的智能聚合与多视角分析平台。项目计划提供新闻自动采集、自动分类、跨媒体同一事件识别、事件聚合、多媒体报道对照和来源追溯能力。

当前仓库处于**阶段 2：前端页面与交互开发**。前端已经建立移动端优先的新闻展示系统、搜索、关注和事件关联详情；后端仍只提供健康检查，新闻事件接口尚未实现，因此页面默认明确显示“演示数据 · 非实时新闻”。

## 技术栈

- 前端：Next.js、TypeScript、Tailwind CSS
- 后端：Python、FastAPI
- 数据库：SQLite
- 文本处理：Python
- 语义匹配：本地开源多语言向量模型
- 版本管理：Git

## 当前能力

- 移动端优先的液态玻璃新闻情报首页
- “推荐 / 关注”双视图与全类型新闻下拉筛选
- 内置演示新闻搜索、关注状态和事件关联详情
- 新闻来源、演示时间、报道数量、语言和事件关联展示
- API 优先的数据适配层：尝试请求 `GET /api/v1/events`，失败时回退到本地演示数据
- 后端可启动的 FastAPI 应用与 `GET /api/v1/health` 健康检查
- FastAPI OpenAPI 文档入口
- 统一的环境变量、忽略规则、测试与数据目录约定
- Playwright 移动端交互测试与截图输出

后端事件接口目前仍是规划项，不代表已经实现。所有本地 mock 新闻、来源和时间均明确标记为演示内容。

## 页面与交互

| 区域       | 功能                                            |
| ---------- | ----------------------------------------------- |
| 首页 `/`   | 今日热点新闻流，移动端首屏展示 2-3 个新闻卡片   |
| 顶部导航   | 居中“推荐 / 关注”切换，右上角搜索入口           |
| 分类下拉   | 点击“推荐”展开全部内置类型并筛选新闻            |
| 关注视图   | 展示已关注事件，支持在卡片内取消关注            |
| 搜索层     | 搜索演示事件的标题、摘要、来源、标签和分类      |
| 事件详情层 | 展示事件关联链、来源堆叠和关联事件              |
| 数据状态条 | 明确标注“演示数据 · 非实时新闻”或后端已连接状态 |

演示数据位于 `frontend/src/data/demo-events.ts`。新闻源名称、时间和事件关系均为虚构设计样本。

## 环境要求

- Node.js 20.9 或更高版本
- pnpm 11 或更高版本
- Python 3.11 或更高版本
- Git 2.40 或更高版本

## 初始化

在仓库根目录执行：

```powershell
git init -b main
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env.local

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".\backend[dev]"

Set-Location frontend
pnpm install
Set-Location ..
```

如果仓库已经初始化，不要重复执行 `git init`。首次提交建议使用：

```powershell
git add .
git commit -m "chore: initialize project foundation"
git branch backend
git branch frontend
```

阶段验收前不创建标签。提交信息和分支规则见 [docs/development.md](docs/development.md)。

## 运行方式

启动后端（在仓库根目录执行）：

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000 --env-file .env
```

- 健康检查：<http://127.0.0.1:8000/api/v1/health>
- OpenAPI 文档：<http://127.0.0.1:8000/docs>

启动前端（另开一个终端）：

```powershell
Set-Location frontend
pnpm dev
```

前端默认地址：<http://localhost:3000>

## 检查命令

```powershell
# 后端测试（在仓库根目录执行）
.\.venv\Scripts\Activate.ps1
python -m pytest

# 后端静态检查
python -m ruff check backend tests

# 前端检查
Set-Location frontend
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
```

Playwright 使用本机 Chrome，测试截图输出到 `frontend/test-results/`。

## 目录结构

```text
.
├── frontend/                 # Next.js + TypeScript + Tailwind CSS
│   ├── public/
│   ├── src/app/              # App Router 页面与全局样式
│   ├── src/components/news/  # 首页、卡片、搜索和详情组件
│   ├── src/data/             # 演示数据与分类视觉配置
│   ├── src/hooks/            # 关注状态与弹层行为
│   ├── src/lib/              # API 回退、格式化与样式工具
│   ├── src/types/            # TypeScript 领域类型
│   └── playwright.config.ts
├── backend/                  # FastAPI 服务
│   ├── app/
│   │   ├── api/              # API 路由（后续阶段）
│   │   ├── core/             # 配置与公共基础设施（后续阶段）
│   │   ├── db/               # SQLite 连接与会话（后续阶段）
│   │   ├── models/           # 持久化模型（后续阶段）
│   │   ├── schemas/          # Pydantic 接口模型（后续阶段）
│   │   ├── services/         # 采集、处理、匹配与聚合服务（后续阶段）
│   │   └── main.py           # FastAPI 应用入口
│   └── pyproject.toml
├── docs/
│   ├── api.md                # 接口规范与规划
│   ├── architecture.md       # 系统架构与模块职责
│   └── development.md        # Git、风格与开发流程
├── tests/                    # 自动化测试
│   ├── backend/
│   └── frontend/             # Playwright 移动端交互测试
├── data/                     # 本地运行数据，默认不进入版本库
├── .env.example
└── README.md
```

`data/` 只保存本地运行数据，例如 SQLite 数据库、导入样本和缓存。除目录说明文件外，其中的内容默认被 Git 忽略。

## 文档导航

- [系统架构](docs/architecture.md)
- [API 规范](docs/api.md)
- [开发规范](docs/development.md)

## 协作分工

- 开发者 A：后端、新闻采集、分类和事件匹配算法。
- 开发者 B：前端页面、交互和展示。

跨端接口、数据字段和验收标准由两人共同确认。详细协作方式见 [docs/development.md](docs/development.md)。

## 版本状态

当前版本为阶段 2 前端展示验收版本。后端事件接口尚未完成，前端使用明确标记的演示数据。阶段标签应在双方完成界面和交互验收后创建，仓库中是否已有提交或标签以实际 Git 状态为准。

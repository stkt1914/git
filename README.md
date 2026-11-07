# 智览时政

“智览时政”是一个面向海内外新闻的智能聚合与多视角分析平台。项目计划提供新闻自动采集、自动分类、跨媒体同一事件识别、事件聚合、多媒体报道对照和来源追溯能力。

当前仓库已完成**新闻信源接入与采集基础**。后端支持来源配置、真实网络验证、RSS/Atom 采集、去重入库、暂停恢复、定时/手动采集和日志；前端优先读取真实新闻，接口不可用时才回退到明确标记的演示数据。

## 技术栈

- 前端：Next.js、TypeScript、Tailwind CSS
- 后端：Python、FastAPI
- 数据库：SQLite
- 文本处理：Python
- 语义匹配：本地开源多语言向量模型
- 版本管理：Git

## 当前能力

- 移动端优先的液态玻璃新闻情报首页
- 深蓝黑背景与高透明度玻璃新闻卡片
- “推荐 / 关注”双视图与全类型新闻下拉筛选
- 关注状态、事件关联详情和来源追溯
- 新闻来源、发布时间、报道数量和语言展示
- API 优先的数据适配层：请求 `/api/v1/news`，失败时才回退到本地演示数据
- 15 个首批来源的统一配置与验证结果
- RSS/Atom 采集、HTTP 重试、失败隔离、暂停恢复和采集日志
- SQLite `news_sources`、`news`、`collection_logs`、`source_validations` 表
- 手机尺寸信源管理页，可查看状态并手动采集/暂停
- FastAPI OpenAPI 文档入口
- 统一的环境变量、忽略规则、测试与数据目录约定
- Playwright 移动端交互测试与截图输出

事件聚合、AI 摘要、跨媒体事件匹配和完整来源关系仍属于后续阶段。未确认授权的正文和图片不会入库。

## 信源采集状态

当前实际验证结果见 [新闻信源与采集报告](docs/news_sources.md)：

- 候选来源：15
- 当前启用 RSS 来源：9
- 普通网页来源：4，默认关闭自动解析
- 已入库真实新闻：242 条
- 已入库媒体：9
- 最新入库新闻时间：2026-11-07T16:09:11Z

所有启用来源当前只保存标题、摘要、发布时间和原文链接。来源正文与图片字段保持为空，待逐源授权核查。

当前写操作接口和 `/sources` 管理页没有登录鉴权，只适合本地或受信网络使用；公网部署前必须增加访问控制。

## 页面与交互

| 区域       | 功能                                             |
| ---------- | ------------------------------------------------ |
| 首页 `/`   | 桌面端显示 393 × 852 手机预览框，四周保持黑色    |
| 手机应用   | `/app` 内嵌手机视图，移动端全屏、桌面端固定尺寸  |
| 信源管理   | `/sources` 桌面手机预览，`/app/sources` 手机页面 |
| 顶部导航   | 仅保留居中“推荐 / 关注”切换                      |
| 分类下拉   | 点击“推荐”展开全部内置类型并筛选新闻             |
| 关注视图   | 展示已关注事件，支持在卡片内取消关注             |
| 事件详情层 | 支持手机上下滑动，展示关联链、来源追溯和关联事件 |
| 演示标记   | 标题区和每张新闻卡片明确标注演示数据             |

演示数据位于 `frontend/src/data/demo-events.ts`。新闻源名称、时间和事件关系均为虚构设计样本。

真实新闻来源会显示为可点击的“原文”链接；当前演示来源保持不可点击并明确标记。

桌面端根页面只提供手机尺寸预览，不单独设计桌面布局，确保电脑测试与真实手机断点一致。

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

信源验证和采集命令：

```powershell
$env:PYTHONPATH = "backend"

# 验证全部来源
.\.venv\Scripts\python.exe -m app.cli validate --all

# 采集全部启用来源
.\.venv\Scripts\python.exe -m app.cli collect --all

# 采集单个来源
.\.venv\Scripts\python.exe -m app.cli collect bbc_world
```

启动前端（另开一个终端）：

```powershell
Set-Location frontend
pnpm dev
```

前端默认地址：<http://localhost:3000>

- 新闻首页：<http://localhost:3000>
- 信源管理：<http://localhost:3000/sources>

## 检查命令

```powershell
# 后端测试（在仓库根目录执行）
.\.venv\Scripts\Activate.ps1
python -m pytest

# 后端静态检查
python -m ruff format --check backend tests
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
│   ├── src/app/api/backend/  # 同源后端代理，支持手机通过前端域名访问 API
│   ├── src/components/news/  # 新闻首页组件
│   ├── src/components/admin/ # 手机信源管理组件
│   ├── src/data/             # 演示数据与分类视觉配置
│   ├── src/hooks/            # 关注状态与弹层行为
│   ├── src/lib/              # API 回退、格式化与样式工具
│   ├── src/types/            # TypeScript 领域类型
│   └── playwright.config.ts
├── backend/                  # FastAPI 服务
│   ├── app/
│   │   ├── api/              # 来源、采集、日志和新闻 API
│   │   ├── config/           # 设置与 news_sources.yaml
│   │   ├── db/               # SQLite 连接与会话
│   │   ├── models/           # 新闻、来源、验证和日志模型
│   │   ├── schemas/          # Pydantic 接口模型
│   │   ├── services/         # 验证、采集、标准化和调度
│   │   └── main.py           # FastAPI 应用入口
│   └── pyproject.toml
├── docs/
│   ├── api.md                # 接口规范与规划
│   ├── architecture.md       # 系统架构与模块职责
│   ├── news_sources.md       # 信源验证与真实采集报告
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
- [新闻信源与采集报告](docs/news_sources.md)
- [开发规范](docs/development.md)

## 协作分工

- 开发者 A：后端、新闻采集、分类和事件匹配算法。
- 开发者 B：前端页面、交互和展示。

跨端接口、数据字段和验收标准由两人共同确认。详细协作方式见 [docs/development.md](docs/development.md)。

## 版本状态

当前版本为新闻信源接入与采集基础版本。事件聚合、AI 摘要和跨媒体事件识别尚未实现，阶段标签需在验收后另行创建。

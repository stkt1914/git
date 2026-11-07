# 开发规范

## 1. 团队分工

### 开发者 A：后端与算法

负责：

- FastAPI 接口、服务层和 SQLite 数据模型
- 新闻采集、正文规范化、去重和分类
- 多语言向量模型接入、事件匹配和聚合算法
- 后端测试、性能基线和数据处理脚本
- 后端相关文档与接口契约维护

主要分支：`backend`

### 开发者 B：前端与交互

负责：

- Next.js 页面、组件和路由
- 新闻事件列表、详情、媒体对照和来源追溯交互
- 加载、空状态、错误状态、响应式与无障碍体验
- 前端测试、样式体系和构建检查
- 前端文档与接口消费约定维护

主要分支：`frontend`

### 共同责任

- 接口字段、错误结构、分页和枚举值变更由两人共同确认。
- 跨端功能需要同时在 `docs/api.md` 中更新契约。
- 每阶段结束共同执行验收清单。
- 不允许单方面把未验收功能合入 `main`。

## 2. Git 分支规范

| 分支 | 用途 | 规则 |
| --- | --- | --- |
| `main` | 稳定分支 | 只接收通过验收的变更 |
| `backend` | 后端集成分支 | 开发者 A 的日常集成分支 |
| `frontend` | 前端集成分支 | 开发者 B 的日常集成分支 |

推荐工作流：

1. 从对应集成分支创建短期功能分支：`feat/<scope>`、`fix/<scope>` 或 `chore/<scope>`。
2. 开发者完成代码、测试和文档后，提交到自己的集成分支。
3. 阶段功能在集成分支验证通过后，再合并到 `main`。
4. 合并前确认工作区干净、测试通过、文档一致。

示例：

```powershell
git switch backend
git switch -c feat/news-ingestion
# 开发与测试
git commit -m "feat(ingestion): add source collector interface"
git switch backend
git merge --no-ff feat/news-ingestion
```

若仓库配置了远程仓库，合并到 `main` 前使用 Pull Request 或合并请求；审查通过后再合并。

## 3. 提交规范

采用 Conventional Commits：

```text
<type>(<scope>): <subject>
```

允许的常用类型：

| 类型 | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档变更 |
| `test` | 测试变更 |
| `refactor` | 不改变行为的重构 |
| `perf` | 性能优化 |
| `build` | 构建或依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 维护性变更 |

示例：

```text
feat(api): add event list endpoint
fix(matching): reject candidates outside time window
docs(architecture): clarify provenance boundary
chore(repo): initialize project foundation
```

要求：

- 一次提交只表达一个逻辑变更。
- 提交前运行相关测试和格式检查。
- 不提交数据库、日志、模型权重、缓存或真实密钥。
- 不使用 `--no-verify` 绕过检查，除非有明确且记录在提交说明中的原因。
- **禁止伪造提交时间**：不得通过 `--date`、`GIT_AUTHOR_DATE`、`GIT_COMMITTER_DATE` 或改写提交历史来补造开发记录。
- 不为了让记录“看起来完整”而拆分或伪造提交。项目记录以真实开发过程为准。

## 4. 代码风格

### 通用

- 文件使用 UTF-8，默认 LF 换行，保留末尾换行。
- 不提交生成物和本地运行时数据。
- 命名应表达领域含义，避免无上下文的 `data`、`item`、`manager`。
- 注释解释约束和原因，不复述代码表面行为。

### Python

- 目标版本：Python 3.11+
- 格式化和静态检查：Ruff
- 行宽：100
- 类型标注优先覆盖公共函数和边界模型
- 采集、清洗、匹配等核心逻辑应可独立单元测试
- 外部请求、文件系统和模型推理应通过明确边界封装

检查命令：

```powershell
python -m ruff format --check backend tests
python -m ruff check backend tests
python -m pytest
```

### TypeScript / React

- TypeScript 保持 `strict` 模式
- 使用 App Router 和函数组件
- 使用 ESLint 与 Prettier
- Tailwind CSS 使用工具类；重复较多时再抽取组件或样式常量
- 数据访问集中到 `src/lib`，业务组件不直接散落请求代码
- 服务端组件与客户端组件边界清晰；只有需要浏览器状态或事件时才使用 `"use client"`

检查命令：

```powershell
Set-Location frontend
pnpm lint
pnpm format:check
pnpm build
```

## 5. 环境变量与密钥

- 根目录 `.env.example` 只保存变量名和安全占位值。
- 本地复制为 `.env`，不得提交。
- 前端公开变量使用 `NEXT_PUBLIC_` 前缀；该前缀变量会进入浏览器包，不能存放密钥。
- 后端密钥只通过环境变量注入。
- 如密钥意外提交，应立即作废并轮换，不能只从最新提交中删除。

## 6. 测试与质量门禁

提交或合并前至少满足：

- 后端健康检查测试通过。
- 后端 Ruff 检查通过。
- 前端 ESLint、Prettier 检查和构建通过。
- 新增业务逻辑有对应单元测试或明确说明暂时无法覆盖的原因。
- API 变更已同步 `docs/api.md`。
- 架构边界变更已同步 `docs/architecture.md`。

初始化阶段尚无业务测试覆盖率目标。进入业务阶段后按模块逐级补充。

## 7. 开发流程

1. **确认范围**：明确本阶段要解决的问题、验收标准和不在范围内的事项。
2. **更新契约**：涉及跨端功能时先更新 API 文档或数据模型约定。
3. **分支开发**：在对应集成分支下使用短期功能分支。
4. **本地验证**：运行测试、静态检查和必要的手工验收。
5. **代码审查**：检查行为、边界、安全性、可测试性和文档一致性。
6. **阶段验收**：对照验收清单确认完成情况。
7. **合并稳定分支**：验收通过后合并到 `main`。
8. **创建阶段标签**：仅在验收通过后创建标签，例如 `v0.1.0`。标签不是提交的替代品。

## 8. 阶段标签

- 标签格式：`v<major>.<minor>.<patch>`。
- 仅由验收负责人或双方确认后创建。
- 初始化阶段未验收、未实现业务功能，因此当前不创建阶段标签。
- 标签必须指向真实验收对应的提交，不为补齐历史而伪造标签时间。

示例：

```powershell
git tag -a v0.1.0 -m "phase 1: engineering foundation accepted"
git show v0.1.0
```

以上命令只能在阶段验收后执行。


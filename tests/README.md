# Tests

测试目录按前后端拆分：

```text
tests/
├── backend/   # FastAPI、服务层、数据访问和算法测试
└── frontend/  # 组件、交互和端到端测试
```

后端测试在仓库根目录运行：

```powershell
.\.venv\Scripts\Activate.ps1
python -m pytest
```

后端单元测试使用本地 RSS/Atom 夹具和模拟 HTTP 响应，不依赖外部网络。真实网络验证结果记录在 `docs/news_sources.md`。

真实来源验证与采集：

```powershell
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python.exe -m app.cli validate --all
.\.venv\Scripts\python.exe -m app.cli collect --all
```

前端测试使用 Playwright，在 `frontend/` 目录运行：

```powershell
pnpm test:e2e
```

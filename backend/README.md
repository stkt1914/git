# Backend

FastAPI 后端工程。当前包含新闻信源配置、真实网络验证、RSS/Atom 采集、标准化、SQLite 持久化、定时/手动采集和信源管理 API。

尚未包含新闻分类、AI 摘要、向量匹配和事件聚合。

在仓库根目录安装：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".\backend[dev]"
```

启动：

```powershell
python -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

接口文档：<http://127.0.0.1:8000/docs>

来源配置：`app/config/news_sources.yaml`

验证与采集：

```powershell
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python.exe -m app.cli validate --all
.\.venv\Scripts\python.exe -m app.cli collect --all
```


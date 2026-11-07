# Backend

FastAPI 后端工程。当前只包含服务入口和健康检查，不包含采集、分类、事件匹配或数据库业务代码。

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


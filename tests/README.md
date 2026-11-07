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

前端测试将在引入测试框架后通过 `frontend/package.json` 中的脚本运行。


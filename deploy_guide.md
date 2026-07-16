# FreeBuddy 部署排错手册

> 适用版本：1.0.0 · 最后更新：2026-07

---

## 一、环境要求

| 组件 | 最低要求 | 推荐版本 |
|------|----------|----------|
| Node.js | ≥ 18.x | 20.x LTS |
| npm | ≥ 9.x | 10.x |
| TypeScript | ≥ 5.x | 5.3+ |
| 操作系统 | Windows 10+/macOS 12+/Ubuntu 20+ | 24H2/14/22.04 |

---

## 二、安装步骤

### 2.1 基础安装

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install

# 网络子服务依赖
cd ../network_service
npm install
```

### 2.2 首次启动

```bash
# 回到项目根目录
cd ..

# Windows
start.bat

# Linux/macOS
chmod +x start.sh
./start.sh
```

> 启动后自动创建 `private_workspace/` 子目录和 SQLite 数据库。

---

## 三、端口占用说明

| 端口 | 服务 | 可配置 | 说明 |
|------|------|--------|------|
| 3100 | 后端 API + WebSocket | 是（`app.ts`） | Express HTTP + ws |
| 5173 | 前端 Vite 开发服务器 | 是（`vite.config.ts`） | 代理 /api → 3100 |
| 9101 | 网络子服务 HTTP 触发器 | 是（`triggerHttp.ts`） | 127.0.0.1 仅本地 |
| 9200 | P2P 节点监听 | 是（`p2pSync.ts`） | WebSocket 对外 |

**常见问题：端口被占**

```bash
# Windows 查看占用
netstat -ano | findstr :3100
taskkill /PID <PID> /F

# Linux/macOS 查看占用
lsof -i :3100
kill -9 <PID>
```

---

## 四、常见错误与排错

### 4.1 `ts-node` 报错

```
error TS5110: Option 'module' must be set to 'NodeNext' when option 'moduleResolution' is set to 'NodeNext'.
```

**原因**：TypeScript 版本与 tsconfig 配置不兼容。
**解决**：确保 `tsconfig.json` 中 `module: "CommonJS"` + `esModuleInterop: true`，而非 `NodeNext`。

### 4.2 SQLite 模块编译失败

```
node-gyp rebuild 失败 / sqlite3 安装错误
```

**Windows 解决**：

```bash
npm install --build-from-source sqlite3
# 或安装 windows-build-tools（管理员 PowerShell）
npm install --global windows-build-tools
```

**Linux 解决**：

```bash
sudo apt install python3 make g++   # Ubuntu/Debian
sudo dnf install python3 make gcc-c++  # Fedora/RHEL
```

### 4.3 WebSocket 连接失败

**现象**：前端日志显示"实时日志连接断开"
**排查**：

1. 确认后端 3100 端口启动正常
2. 浏览器控制台 → Network → WS 检查连接状态
3. 检查是否有防火墙拦截 WebSocket 升级请求

### 4.4 Tracker 注册失败

**现象**：`audit_log/` 中出现 `[network_tracker_error]` 日志
**原因**：Tracker 服务地址为示例域名，未配置真实 Tracker。
**解决**：修改 `network_service/src/trackerClient.ts` 中的 `TRACKER_URL` 为实际地址，或忽略该错误（本地单机运行不影响）。

### 4.5 CDN 基线拉取失败

**原因**：CDN 地址为示例域名。
**解决**：修改 `cdnFetch.ts` 中的 `CDN_BASE_URL` 为实际 CDN 地址，或忽略（不影响核心功能）。

### 4.6 前端编译错误

```bash
cd frontend
npm run typecheck
```

常见错误：
- **模块找不到**：`npm install` 重新安装
- **类型不匹配**：检查 `global.d.ts` 与后端返回结构是否一致

---

## 五、生产部署建议

### 5.1 构建

```bash
# 后端
cd backend && npm run build

# 前端
cd ../frontend && npm run build  # 输出到 dist/

# 网络子服务
cd ../network_service && npm run build
```

### 5.2 PM2 进程管理（Linux）

```bash
npm install -g pm2

pm2 start backend/dist/app.js --name freebuddy-backend
pm2 start frontend/dist/server.js --name freebuddy-frontend  # 如有 SSR
pm2 start network_service/dist/index.js --name freebuddy-network

pm2 save
pm2 startup
```

### 5.3 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /path/to/frontend/dist;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 六、数据目录

| 目录 | 用途 | 是否备份 |
|------|------|----------|
| `private_workspace/database/` | SQLite 数据库文件 | ✅ 建议备份 |
| `private_workspace/project_source/` | 项目源码工作区 | ✅ |
| `private_workspace/project_archive/` | 归档 tar 包 | ✅ |
| `private_workspace/ticket_records/` | 工单记录附件 | ✅ |
| `private_workspace/user_config/` | 用户配置 | ✅ |
| `audit_log/` | 审计日志文件 | ✅ |
| `public_rule_library/` | 公共规则库 | ⚠️ 可选 |

---

## 七、卸载清理

```bash
# 删除 node_modules
rm -rf backend/node_modules frontend/node_modules network_service/node_modules

# 删除编译产物
rm -rf backend/dist frontend/dist network_service/dist

# 删除数据库（谨慎！丢失所有数据）
rm -f private_workspace/database/freebuddy.db

# 删除审计日志
rm -rf audit_log/
```

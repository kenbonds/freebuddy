import express, { Express } from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs-extra";

import { initDatabase } from "./db/init";
import globalRouter from "./routes/index";
import { createWsServer } from "./websocket/wsServer";
import { writeAuditLog } from "./utils/auditLogger";

// 强制初始化固定目录结构
const initFixedDirs = () => {
  const root = path.resolve(__dirname, "../../");
  const dirList = [
    path.join(root, "private_workspace", "project_source"),
    path.join(root, "private_workspace", "project_archive"),
    path.join(root, "private_workspace", "database"),
    path.join(root, "private_workspace", "ticket_records"),
    path.join(root, "private_workspace", "user_config"),
    path.join(root, "public_rule_library", "agent_prompt"),
    path.join(root, "public_rule_library", "pipeline_rule"),
    path.join(root, "public_rule_library", "arch_template"),
    path.join(root, "public_rule_library", "deploy_script"),
    path.join(root, "audit_log"),
  ];
  dirList.forEach((d) => fs.ensureDirSync(d));
};

const bootstrap = async () => {
  // 1. 创建目录
  initFixedDirs();
  writeAuditLog("系统启动，初始化固定目录完成");

  // 2. 初始化数据库 SQLite
  await initDatabase();
  writeAuditLog("SQLite 数据库初始化成功");

  // 3. Express 实例
  const app: Express = express();
  const PORT = 3100;

  // 中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // 路由挂载
  app.use("/api", globalRouter);

  // 4. HTTP 服务
  const server = http.createServer(app);

  // 5. WebSocket 服务挂载
  createWsServer(server);

  // 6. 启动监听
  server.listen(PORT, () => {
    writeAuditLog(`后端服务已启动，监听端口 ${PORT}`);
    console.log(`FreeBuddy Backend Running on http://127.0.0.1:${PORT}`);
  });
};

bootstrap().catch((err) => {
  writeAuditLog(`服务启动异常: ${String(err)}`);
  console.error("启动失败", err);
  process.exit(1);
});

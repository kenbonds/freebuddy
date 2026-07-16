import { Sequelize, QueryTypes } from "sequelize";
import path from "path";
import fs from "fs-extra";

// 数据库文件固定路径：private_workspace/database/freebuddy.db
const DB_PATH = path.resolve(__dirname, "../../../private_workspace/database/freebuddy.db");

// 确保数据库父目录存在
fs.ensureDirSync(path.dirname(DB_PATH));

// 实例化Sequelize，强制使用QueryTypes规范SQL
export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_PATH,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 统一导出QueryTypes供所有Model使用
export { QueryTypes };

// 导入所有模型
import "./models/Project";
import "./models/Ticket";
import "./models/AgentPrompt";
import "./models/ModelConfig";
import "./models/AuditRecord";

// 数据库初始化：连接 + 同步表结构（不存在则创建，不删除已有数据）
export async function initDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false, force: false });
  } catch (e) {
    throw new Error(`数据库初始化失败: ${String(e)}`);
  }
}

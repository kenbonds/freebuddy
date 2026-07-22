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
import "./models/Role";
import "./models/KnowledgeLedger";
import "./models/QARule";
import "./models/QAReport";
import "./models/Goal";
import "./models/ChatSession";
import "./models/ChatMessage";

// 数据库初始化：连接 + 同步表结构（不存在则创建，不删除已有数据）
export async function initDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false, force: false });
    // 增量迁移：新增审计日志字段
    await migrateAuditColumns();
    // 增量迁移：新增goal相关字段
    await migrateGoalColumns();
  } catch (e) {
    throw new Error(`数据库初始化失败: ${String(e)}`);
  }
}

/**
 * 审计日志表增量迁移：添加新字段（兼容已有数据库）
 */
async function migrateAuditColumns(): Promise<void> {
  const newCols = [
    { name: "operator", def: "VARCHAR(255) DEFAULT 'system'" },
    { name: "entityType", def: "VARCHAR(255) DEFAULT ''" },
    { name: "entityId", def: "INTEGER" },
    { name: "detail", def: "TEXT DEFAULT ''" },
    { name: "prevHash", def: "VARCHAR(255) DEFAULT ''" }
  ];
  for (const col of newCols) {
    try {
      await sequelize.query(`ALTER TABLE audit_record ADD COLUMN ${col.name} ${col.def}`, { raw: true });
    } catch {
      // 字段已存在则忽略
    }
  }
}

/**
 * 增量迁移：给project和ticket表添加goalId字段
 */
async function migrateGoalColumns(): Promise<void> {
  const migrations = [
    "ALTER TABLE project ADD COLUMN goalId INTEGER",
    "ALTER TABLE ticket ADD COLUMN goalId INTEGER"
  ];
  for (const sql of migrations) {
    try {
      await sequelize.query(sql, { raw: true });
    } catch {
      // 字段已存在则忽略
    }
  }
}

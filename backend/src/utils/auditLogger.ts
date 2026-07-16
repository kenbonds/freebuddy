import fs from "fs-extra";
import path from "path";
import AuditRecord from "../db/models/AuditRecord";

const LOG_ROOT = path.resolve(__dirname, "../../../audit_log");
fs.ensureDirSync(LOG_ROOT);

/**
 * 写入审计日志：本地文件追加 + 数据库持久化
 * @param logContent 日志正文
 * @param logType 日志分类：system / network / upload / heartbeat / p2p / cdn / archive
 */
export async function writeAuditLog(logContent: string, logType: string = "system"): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = now.toLocaleDateString("zh-CN").replace(/\//g, "-");
  const line = `[${timestamp}] [${logType}] ${logContent}\n`;

  // 1. 写入按天分割日志文件
  const logFile = path.join(LOG_ROOT, `${dateStr}.log`);
  fs.appendFileSync(logFile, line, "utf8");

  // 2. 写入数据库审计表
  await AuditRecord.create({
    logType,
    content: logContent,
    timestamp
  }).catch(() => {
    // 数据库写入失败不阻断主流程，仅落文件日志
  });
}

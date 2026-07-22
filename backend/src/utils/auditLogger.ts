import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import AuditRecord from "../db/models/AuditRecord";

const LOG_ROOT = path.resolve(__dirname, "../../../audit_log");
fs.ensureDirSync(LOG_ROOT);

// 用于记录上一个hash值（内存缓存，每次启动从最后一条文件记录恢复）
let lastFileHash = "";

/**
 * 从日志文件中恢复最后的hash值
 */
function restoreLastHash(): void {
  try {
    const files = fs.readdirSync(LOG_ROOT).filter(f => f.endsWith(".log")).sort().reverse();
    if (files.length === 0) return;
    const lastFile = path.join(LOG_ROOT, files[0]);
    const lines = fs.readFileSync(lastFile, "utf8").trim().split("\n");
    if (lines.length === 0) return;
    const lastLine = lines[lines.length - 1];
    const hashMatch = lastLine.match(/HASH:([a-f0-9]+)$/);
    if (hashMatch) lastFileHash = hashMatch[1];
  } catch { /* 首次启动无历史日志 */ }
}

/**
 * 计算hash（前一块hash + 当前行）
 */
function computeHash(prevHash: string, logLine: string): string {
  return crypto.createHash("sha256").update(prevHash + logLine).digest("hex");
}

export interface AuditLogOptions {
  content: string;
  logType?: string;
  operator?: string;
  entityType?: string;
  entityId?: number | null;
  detail?: string;
}

/**
 * 写入审计日志：
 * - 本地文件追加（带SHA256 hash链，防篡改）
 * - 数据库持久化（带操作人/实体信息）
 */
export async function writeAuditLog(
  logContent: string,
  logType: string = "system",
  operator?: string,
  entityType?: string,
  entityId?: number | null,
  detail?: string
): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = now.toLocaleDateString("zh-CN").replace(/\//g, "-");
  const op = operator || "system";

  // 构建文件日志行（带hash链）
  const logLine = `[${timestamp}] [${logType}] [${op}] ${logContent}`;
  const hash = computeHash(lastFileHash, logLine);
  const fileLine = `${logLine} HASH:${hash}\n`;

  // 1. 写入按天分割日志文件
  const logFile = path.join(LOG_ROOT, `${dateStr}.log`);
  fs.appendFileSync(logFile, fileLine, "utf8");
  lastFileHash = hash;

  // 2. 写入数据库审计表
  await AuditRecord.create({
    logType,
    content: logContent,
    timestamp,
    operator: op,
    entityType: entityType || "",
    entityId: entityId ?? null,
    detail: detail || "",
    prevHash: hash
  }).catch(() => {
    // 数据库写入失败不阻断主流程
  });
}

/**
 * 校验日志文件完整性（从尾到头遍历hash链）
 */
export function verifyLogIntegrity(logFilePath: string): { valid: boolean; brokenAt?: number; total: number } {
  if (!fs.existsSync(logFilePath)) return { valid: false, total: 0 };
  const lines = fs.readFileSync(logFilePath, "utf8").trim().split("\n").filter(Boolean);
  let prevHash = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hashMatch = line.match(/ HASH:([a-f0-9]+)$/);
    if (!hashMatch) return { valid: false, brokenAt: i + 1, total: lines.length };
    const hash = hashMatch[1];
    const contentLine = line.replace(/ HASH:[a-f0-9]+$/, "");
    const expectedHash = computeHash(prevHash, contentLine);
    if (hash !== expectedHash) return { valid: false, brokenAt: i + 1, total: lines.length };
    prevHash = hash;
  }
  return { valid: true, total: lines.length };
}

// 启动时恢复hash
restoreLastHash();

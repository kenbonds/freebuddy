import fs from "fs-extra";
import path from "path";

const LOG_ROOT = path.resolve(__dirname, "../../audit_log");
fs.ensureDirSync(LOG_ROOT);

export function writeNetLog(type: string, content: string): void {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = now.toLocaleDateString("zh-CN").replace(/\//g, "-");
  const line = `[${timestamp}] [network_${type}] ${content}\n`;
  const logFile = path.join(LOG_ROOT, `${dateStr}.log`);
  fs.appendFileSync(logFile, line, "utf8");
}

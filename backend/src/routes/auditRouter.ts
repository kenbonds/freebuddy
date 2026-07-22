import { Router } from "express";
import { Op } from "sequelize";
import path from "path";
import fs from "fs-extra";
import AuditRecord from "../db/models/AuditRecord";
import { requirePermission } from "../middleware/permission";
import { verifyLogIntegrity } from "../utils/auditLogger";

const router = Router();

const AUDIT_LOG_ROOT = path.resolve(__dirname, "../../../audit_log");

// 分页查询审计日志
router.get("/list", requirePermission("log_view"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const logType = req.query.logType as string | undefined;
  const keyword = req.query.keyword as string | undefined;

  const where: Record<string, unknown> = {};
  if (logType) where.logType = logType;
  if (keyword) where.content = { [Op.like]: `%${keyword}%` };

  const { rows, count } = await AuditRecord.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset,
    limit: pageSize
  });
  res.json({ code: 0, msg: "ok", data: { list: rows, total: count, page, pageSize } });
});

// 获取日志类型列表（用于筛选下拉）
router.get("/types", requirePermission("log_view"), async (_req, res) => {
  const types = await AuditRecord.findAll({
    attributes: ["logType"],
    group: ["logType"]
  });
  res.json({ code: 0, msg: "ok", data: types.map(t => t.logType) });
});

// 全量导出审计日志（支持类型+关键词筛选，不分页）
router.get("/exportAll", requirePermission("log_view"), async (req, res) => {
  const logType = req.query.logType as string | undefined;
  const keyword = req.query.keyword as string | undefined;

  const where: Record<string, unknown> = {};
  if (logType) where.logType = logType;
  if (keyword) where.content = { [Op.like]: `%${keyword}%` };

  const all = await AuditRecord.findAll({
    where,
    order: [["createdAt", "DESC"]]
  });
  res.json({ code: 0, msg: "ok", data: { total: all.length, rows: all } });
});

// 校验审计日志文件完整性
router.get("/verify", requirePermission("log_view"), async (_req, res) => {
  const results: Array<{ date: string; valid: boolean; total: number; brokenAt?: number }> = [];
  if (fs.existsSync(AUDIT_LOG_ROOT)) {
    const files = fs.readdirSync(AUDIT_LOG_ROOT).filter(f => f.endsWith(".log")).sort();
    for (const file of files) {
      const filePath = path.join(AUDIT_LOG_ROOT, file);
      const result = verifyLogIntegrity(filePath);
      results.push({ date: file.replace(".log", ""), ...result });
    }
  }
  const allValid = results.every(r => r.valid);
  res.json({ code: 0, msg: allValid ? "审计日志完整" : "审计日志可能被篡改", data: { allValid, files: results } });
});

export default router;

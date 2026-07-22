import { Router } from "express";
import {
  executeQAPipeline,
  getLatestReport,
  getReportsByTicket,
  listReports
} from "../services/qaPipelineService";
import { requirePermission } from "../middleware/permission";
import { writeAuditLog } from "../utils/auditLogger";

const router = Router();

// 手动触发质检流水线
router.post("/run/:ticketId", requirePermission("qa_check"), async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const report = await executeQAPipeline(ticketId, "manual");
    writeAuditLog(`手动触发质检流水线 工单ID:${ticketId}`, "qa");
    res.json({ code: 0, msg: "质检流水线执行完成", data: report });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取工单的最新质检报告
router.get("/latest/:ticketId", async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const report = await getLatestReport(ticketId);
    res.json({ code: 0, msg: "ok", data: report });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取工单的所有质检报告
router.get("/reports/:ticketId", async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const list = await getReportsByTicket(ticketId);
    res.json({ code: 0, msg: "ok", data: list });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 分页查询所有质检报告
router.get("/list", requirePermission("log_view"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const result = req.query.result as string | undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const data = await listReports(page, pageSize, { result: result ?? undefined, projectId: projectId ?? undefined });
    res.json({ code: 0, msg: "ok", data });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

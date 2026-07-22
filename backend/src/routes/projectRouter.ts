import { Router, Request } from "express";
import Project from "../db/models/Project";
import Ticket from "../db/models/Ticket";
import { writeAuditLog } from "../utils/auditLogger";
import { requirePermission } from "../middleware/permission";
import { checkArchiveConditions } from "../services/archiveService";

const router = Router();

// 新建项目
router.post("/create", async (req: Request, res) => {
  try {
    const { projectName, description, priority } = req.body;
    const item = await Project.create({
      projectName,
      description,
      priority: priority || "P3",
      archived: false,
      abnormal: false,
      archivePath: null
    });
    writeAuditLog(`创建项目 ${projectName} ID:${item.id}`, "project");
    res.json({ code: 0, msg: "创建成功", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 编辑项目
router.post("/edit", requirePermission("project_edit"), async (req, res) => {
  try {
    const { id, projectName, description, priority } = req.body;
    const item = await Project.findByPk(id);
    if (!item) return res.json({ code: 1, msg: "项目不存在", data: null });
    if (item.archived) return res.json({ code: 1, msg: "已归档项目不可编辑", data: null });
    if (projectName) item.projectName = projectName;
    if (description) item.description = description;
    if (priority) item.priority = priority;
    await item.save();
    writeAuditLog(`编辑项目 ${item.projectName} ID:${item.id}`, "project");
    res.json({ code: 0, msg: "更新成功", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 查询所有项目（兼容旧格式，直接返回数组）
router.get("/list", async (_req, res) => {
  const list = await Project.findAll({ order: [["createdAt", "DESC"]] });
  res.json({ code: 0, msg: "ok", data: list });
});

// 分页查询
router.get("/listByPage", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const { rows, count } = await Project.findAndCountAll({
    order: [["createdAt", "DESC"]],
    offset,
    limit: pageSize
  });
  res.json({ code: 0, msg: "ok", data: { list: rows, total: count, page, pageSize } });
});

// 单项目详情
router.get("/detail/:id", async (req: Request, res) => {
  const item = await Project.findByPk(Number(req.params.id));
  res.json({ code: 0, msg: item ? "ok" : "无数据", data: item });
});

// 项目统计卡片
router.get("/stats", async (_req, res) => {
  const all = await Project.findAll();
  const total = all.length;
  const archived = all.filter(p => p.archived).length;
  const abnormal = all.filter(p => p.abnormal).length;
  const normal = total - archived - abnormal;

  // 聚合工单数据
  let ticketTotal = 0;
  let ticketDone = 0;
  let ticketPending = 0;
  for (const p of all) {
    const tickets = await Ticket.findAll({ where: { projectId: p.id } });
    ticketTotal += tickets.length;
    ticketDone += tickets.filter(t => ["已办结", "归档封存"].includes(t.status)).length;
    ticketPending += tickets.filter(t => !["已办结", "归档封存"].includes(t.status)).length;
  }
  const completionRate = ticketTotal > 0 ? Math.round((ticketDone / ticketTotal) * 100) : 0;

  res.json({
    code: 0, msg: "ok",
    data: { total, normal, archived, abnormal, ticketTotal, ticketDone, ticketPending, completionRate }
  });
});

// 一键归档
router.post("/archive", requirePermission("project_archive"), async (req: Request, res) => {
  try {
    const { id } = req.body;
    const item = await Project.findByPk(id);
    if (!item) return res.json({ code: 1, msg: "项目不存在", data: null });
    if (item.archived) return res.json({ code: 1, msg: "已归档，不可重复操作", data: null });
    // 使用统一归档条件检查
    const conditions = await checkArchiveConditions(id);
    if (!conditions.canArchive) {
      const reasons: string[] = [];
      if (!conditions.allTicketsDone) reasons.push(`尚有 ${conditions.unfinishedCount} 个工单未办结`);
      if (!conditions.allQaPassed) reasons.push(`${conditions.qaFailedCount} 个工单质检不合格`);
      return res.json({ code: 1, msg: `归档条件不满足：${reasons.join("；")}`, data: null });
    }
    item.archived = true;
    await item.save();
    writeAuditLog(`项目 ${item.projectName} ID:${id} 已归档`, "archive");
    res.json({ code: 0, msg: "归档成功，项目已锁定只读", data: item.archivePath });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 归档解封
router.post("/unarchive", requirePermission("project_archive"), async (req: Request, res) => {
  try {
    const { id } = req.body;
    const item = await Project.findByPk(id);
    if (!item) return res.json({ code: 1, msg: "项目不存在", data: null });
    if (!item.archived) return res.json({ code: 1, msg: "项目未归档，无需解封", data: null });
    item.archived = false;
    await item.save();
    writeAuditLog(`项目 ${item.projectName} ID:${id} 已解除归档`, "archive");
    res.json({ code: 0, msg: "已解除归档封存", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 标记/取消异常
router.post("/setAbnormal", requirePermission("project_edit"), async (req: Request, res) => {
  try {
    const { id, abnormal } = req.body;
    const item = await Project.findByPk(id);
    if (!item) return res.json({ code: 1, msg: "项目不存在", data: null });
    item.abnormal = !!abnormal;
    await item.save();
    writeAuditLog(`项目 ${item.projectName} ID:${id} 异常状态设为 ${item.abnormal}`, "project");
    res.json({ code: 0, msg: "状态已更新", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;
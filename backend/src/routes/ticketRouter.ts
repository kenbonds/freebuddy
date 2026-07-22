import { Router } from "express";
import {
  createTicket,
  assignTicket,
  startExecute,
  submitForReview,
  rejectTicket,
  resubmitTicket,
  finishTicket,
  editTicket,
  deleteTicket,
  listTicketsByProject,
  getTicketDetail
} from "../services/ticketService";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.post("/create", async (req, res) => {
  try {
    const { projectId, title, content, priority, parentTicketId } = req.body;
    const t = await createTicket(projectId, title, content, priority || "P3", parentTicketId ?? null);
    res.json({ code: 0, msg: "工单创建成功", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/assign", requirePermission("ticket_assign"), async (req, res) => {
  try {
    const { ticketId, targetRole } = req.body;
    const t = await assignTicket(ticketId, targetRole);
    res.json({ code: 0, msg: "指派成功", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/startExecute", requirePermission("task_execute"), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const t = await startExecute(ticketId);
    res.json({ code: 0, msg: "开始执行", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/submitReview", requirePermission("review"), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const t = await submitForReview(ticketId);
    res.json({ code: 0, msg: "已提交复核", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/reject", requirePermission("review"), async (req, res) => {
  try {
    const { ticketId, reason } = req.body;
    const t = await rejectTicket(ticketId, reason);
    res.json({ code: 0, msg: "已驳回工单", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/resubmit", requirePermission("task_execute"), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const t = await resubmitTicket(ticketId);
    res.json({ code: 0, msg: "已重新提交复核", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/finish", requirePermission("review"), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const t = await finishTicket(ticketId);
    res.json({ code: 0, msg: "工单已办结", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/edit", requirePermission("task_execute"), async (req, res) => {
  try {
    const { ticketId, title, content, priority } = req.body;
    const t = await editTicket(ticketId, { title, content, priority });
    res.json({ code: 0, msg: "工单已更新", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/delete", requirePermission("task_execute"), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const t = await deleteTicket(ticketId);
    res.json({ code: 0, msg: "工单已删除", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.get("/list/:projectId", async (req, res) => {
  const list = await listTicketsByProject(Number(req.params.projectId));
  res.json({ code: 0, msg: "ok", data: list });
});

router.get("/detail/:id", async (req, res) => {
  const t = await getTicketDetail(Number(req.params.id));
  res.json({ code: 0, msg: "ok", data: t });
});

export default router;

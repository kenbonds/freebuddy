import { Router, Request, Response } from "express";
import {
  createTicket,
  assignTicket,
  submitForReview,
  rejectTicket,
  finishTicket,
  listTicketsByProject,
  getTicketDetail
} from "../services/ticketService";
import type { ApiResult } from "../types";

const router = Router();

router.post("/create", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const { projectId, title, content, parentTicketId } = req.body;
    const t = await createTicket(projectId, title, content, parentTicketId ?? null);
    res.json({ code: 0, msg: "工单创建成功", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/assign", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const { ticketId, targetRole } = req.body;
    const t = await assignTicket(ticketId, targetRole);
    res.json({ code: 0, msg: "指派成功", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/submitReview", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const { ticketId } = req.body;
    const t = await submitForReview(ticketId);
    res.json({ code: 0, msg: "已提交复核", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/reject", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const { ticketId, reason } = req.body;
    const t = await rejectTicket(ticketId, reason);
    res.json({ code: 0, msg: "已驳回工单", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.post("/finish", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const { ticketId } = req.body;
    const t = await finishTicket(ticketId);
    res.json({ code: 0, msg: "工单已办结", data: t });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.get("/list/:projectId", async (req: Request, res: Response<ApiResult<unknown>>) => {
  const list = await listTicketsByProject(Number(req.params.projectId));
  res.json({ code: 0, msg: "ok", data: list });
});

router.get("/detail/:id", async (req: Request, res: Response<ApiResult<unknown>>) => {
  const t = await getTicketDetail(Number(req.params.id));
  res.json({ code: 0, msg: "ok", data: t });
});

export default router;

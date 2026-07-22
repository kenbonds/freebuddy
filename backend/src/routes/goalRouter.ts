import { Router } from "express";
import {
  createGoal,
  decomposeGoal,
  getGoalTree,
  checkGoalMatch,
  generateGoalReport,
  updateGoalStatus,
  getGoalDashboard
} from "../services/goalService";
import { requirePermission } from "../middleware/permission";

const router = Router();

// 创建目标
router.post("/create", async (req, res) => {
  try {
    const { projectId, title, description, parentGoalId, ticketId } = req.body;
    const goal = await createGoal(projectId, title, description, parentGoalId ?? null, ticketId ?? null);
    res.json({ code: 0, msg: "目标创建成功", data: goal });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 绑定工单到目标
router.post("/bindTicket", async (req, res) => {
  try {
    const { ticketId, goalId } = req.body;
    const Ticket = require("../db/models/Ticket").default;
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.json({ code: 1, msg: "工单不存在", data: null });
    const Goal = require("../db/models/Goal").default;
    const goal = await Goal.findByPk(goalId);
    if (!goal) return res.json({ code: 1, msg: "目标不存在", data: null });
    ticket.goalId = goalId;
    await ticket.save();
    res.json({ code: 0, msg: "工单已绑定目标", data: ticket });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// AI自动拆解总目标
router.post("/decompose/:goalId", async (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const children = await decomposeGoal(goalId);
    res.json({ code: 0, msg: `已拆解为 ${children.length} 个子目标`, data: children });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取目标树
router.get("/tree/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const tree = await getGoalTree(projectId);
    res.json({ code: 0, msg: "ok", data: tree });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 校验工单-目标匹配度
router.post("/checkMatch/:ticketId", async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const result = await checkGoalMatch(ticketId);
    res.json({ code: 0, msg: result.matched ? "目标匹配正常" : "目标匹配度不足", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 生成目标达成度分析报告
router.get("/report/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const report = await generateGoalReport(projectId);
    res.json({ code: 0, msg: "ok", data: report });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 更新目标状态（手动纠偏）
router.put("/updateStatus", requirePermission("task_execute"), async (req, res) => {
  try {
    const { goalId, status, matchScore, deviationReason } = req.body;
    const goal = await updateGoalStatus(goalId, status, matchScore, deviationReason);
    res.json({ code: 0, msg: "目标状态已更新", data: goal });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取项目目标看板
router.get("/dashboard/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const dashboard = await getGoalDashboard(projectId);
    res.json({ code: 0, msg: "ok", data: dashboard });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

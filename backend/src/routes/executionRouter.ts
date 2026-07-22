import { Router } from "express";
import {
  createExecutionSnapshot, getExecutionSnapshot,
  executeNextStep, retryStep, interruptExecution
} from "../services/executionService";
import { detectScene, detectTicketScene } from "../services/sceneDetectService";

const router = Router();

// 创建执行快照
router.post("/createSnapshot/:ticketId", async (req, res) => {
  try {
    const snapshot = await createExecutionSnapshot(Number(req.params.ticketId));
    res.json({ code: 0, msg: "执行快照创建成功", data: snapshot });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取执行快照
router.get("/snapshot/:ticketId", async (req, res) => {
  try {
    const snapshot = getExecutionSnapshot(Number(req.params.ticketId));
    if (!snapshot) return res.json({ code: 1, msg: "执行快照不存在", data: null });
    res.json({ code: 0, msg: "ok", data: snapshot });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 执行下一步
router.post("/nextStep/:ticketId", async (req, res) => {
  try {
    const snapshot = await executeNextStep(Number(req.params.ticketId));
    res.json({ code: 0, msg: "步骤执行完成", data: snapshot });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 重试步骤
router.post("/retry/:ticketId", async (req, res) => {
  try {
    const snapshot = await retryStep(Number(req.params.ticketId));
    res.json({ code: 0, msg: "重试完成", data: snapshot });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 中断执行
router.post("/interrupt/:ticketId", async (req, res) => {
  try {
    const snapshot = interruptExecution(Number(req.params.ticketId));
    res.json({ code: 0, msg: "执行已中断", data: snapshot });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// ========== 双模式场景识别 ==========

// 场景识别（基于文本输入）
router.post("/detectScene", async (req, res) => {
  try {
    const { input, title, contentLength } = req.body;
    const result = detectScene(input || "", title, contentLength);
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 场景识别（基于工单）
router.get("/detectTicketScene/:ticketId", async (req, res) => {
  try {
    const result = await detectTicketScene(Number(req.params.ticketId));
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

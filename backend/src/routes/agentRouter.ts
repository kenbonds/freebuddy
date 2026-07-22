import { Router } from "express";
import { runAgentTask, upsertAgentPrompt } from "../services/agentDispatchService";

const router = Router();

// 执行单条Agent任务调用
router.post("/runTask", async (req, res) => {
  try {
    const { ticketId, modelId, userInput } = req.body;
    const result = await runAgentTask(ticketId, modelId, userInput);
    res.json({ code: 0, msg: "调用完成", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 更新角色提示词模板
router.post("/updatePrompt", async (req, res) => {
  try {
    const { role, promptText, version } = req.body;
    const item = await upsertAgentPrompt(role, promptText, version);
    res.json({ code: 0, msg: "提示词已更新", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

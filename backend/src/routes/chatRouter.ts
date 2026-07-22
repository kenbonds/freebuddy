import { Router } from "express";
import {
  createSession, sendMessage, listSessions,
  getSessionMessages, deleteSession, clearSessionMessages
} from "../services/chatService";

const router = Router();

// 创建对话会话
router.post("/createSession", async (req, res) => {
  try {
    const { title, scene, projectId, ticketId } = req.body;
    const session = await createSession({ title, scene, projectId, ticketId });
    res.json({ code: 0, msg: "对话创建成功", data: session });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 发送消息
router.post("/send", async (req, res) => {
  try {
    const { sessionId, content, modelId } = req.body;
    if (!sessionId || !content) {
      return res.json({ code: 1, msg: "会话ID和消息内容不能为空", data: null });
    }
    const result = await sendMessage({ sessionId, content, modelId });
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取会话列表
router.get("/sessions", async (req, res) => {
  try {
    const { scene } = req.query as any;
    const list = await listSessions(scene);
    res.json({ code: 0, msg: "ok", data: list });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取会话消息
router.get("/messages/:sessionId", async (req, res) => {
  try {
    const result = await getSessionMessages(Number(req.params.sessionId));
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 删除会话
router.delete("/session/:sessionId", async (req, res) => {
  try {
    await deleteSession(Number(req.params.sessionId));
    res.json({ code: 0, msg: "对话已删除", data: null });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 清空会话消息
router.post("/clear/:sessionId", async (req, res) => {
  try {
    await clearSessionMessages(Number(req.params.sessionId));
    res.json({ code: 0, msg: "消息已清空", data: null });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

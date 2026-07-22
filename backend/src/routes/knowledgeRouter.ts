import { Router } from "express";
import {
  createKnowledge, importBatch, searchKnowledge, listByLevel,
  getRelatedKnowledge, incrementReuse, iterateKnowledge,
  getKnowledgeStats, parseDocument, autoTag
} from "../services/knowledgeService";

const router = Router();

// 创建知识
router.post("/create", async (req, res) => {
  try {
    const k = await createKnowledge(req.body);
    res.json({ code: 0, msg: "知识创建成功", data: k });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 批量导入
router.post("/importBatch", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ code: 1, msg: "导入列表不能为空", data: null });
    }
    const created = await importBatch(items);
    res.json({ code: 0, msg: `成功导入 ${created.length} 条知识`, data: created });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 搜索知识
router.get("/search", async (req, res) => {
  try {
    const { keyword, level, projectId, ticketId, goalKeywords, page, pageSize } = req.query as any;
    const result = await searchKnowledge({
      keyword, level,
      ...(projectId ? { projectId: Number(projectId) } : {}),
      ...(ticketId ? { ticketId: Number(ticketId) } : {}),
      goalKeywords: goalKeywords ? goalKeywords.split(",") : undefined,
      page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 20
    });
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 按层级列表
router.get("/list/:level", async (req, res) => {
  try {
    const { projectId } = req.query as any;
    const list = await listByLevel(req.params.level, projectId ? Number(projectId) : undefined);
    res.json({ code: 0, msg: "ok", data: list });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 获取关联知识
router.get("/related", async (req, res) => {
  try {
    const { projectId, ticketId } = req.query as any;
    const list = await getRelatedKnowledge(
      projectId ? Number(projectId) : undefined,
      ticketId ? Number(ticketId) : undefined
    );
    res.json({ code: 0, msg: "ok", data: list });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 递增复用计数
router.post("/reuse/:id", async (req, res) => {
  try {
    const item = await incrementReuse(Number(req.params.id));
    res.json({ code: 0, msg: "复用计数已更新", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 知识迭代
router.post("/iterate/:id", async (req, res) => {
  try {
    const { newContent, changeNote } = req.body;
    const result = await iterateKnowledge(Number(req.params.id), newContent, changeNote);
    res.json({ code: 0, msg: `知识已迭代: ${result.old.version} → ${result.new.version}`, data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 知识统计
router.get("/stats", async (_req, res) => {
  try {
    const stats = await getKnowledgeStats();
    res.json({ code: 0, msg: "ok", data: stats });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 自动打标（测试用）
router.post("/autoTag", async (req, res) => {
  try {
    const { title, content } = req.body;
    const tags = autoTag(title || "", content || "");
    res.json({ code: 0, msg: "ok", data: tags });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 文档解析（测试用）
router.post("/parseDocument", async (req, res) => {
  try {
    const { text, title } = req.body;
    const result = parseDocument(text || "", title || "");
    res.json({ code: 0, msg: "ok", data: result });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

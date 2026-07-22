import { Router } from "express";
import QARule from "../db/models/QARule";
import { writeAuditLog } from "../utils/auditLogger";
import { requirePermission } from "../middleware/permission";

const router = Router();

// 获取所有质检规则
router.get("/list", async (_req, res) => {
  const list = await QARule.findAll({ order: [["createdAt", "DESC"]] });
  res.json({ code: 0, msg: "ok", data: list });
});

// 新增规则
router.post("/add", requirePermission("qa_check"), async (req, res) => {
  try {
    const rule = await QARule.create(req.body);
    writeAuditLog(`新增质检规则: ${rule.ruleName}`, "qa");
    res.json({ code: 0, msg: "规则创建成功", data: rule });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 编辑规则
router.post("/edit", requirePermission("qa_check"), async (req, res) => {
  try {
    const { id, ...updates } = req.body;
    const rule = await QARule.findByPk(id);
    if (!rule) return res.json({ code: 1, msg: "规则不存在", data: null });
    Object.assign(rule, updates);
    await rule.save();
    writeAuditLog(`编辑质检规则 ID:${id}`, "qa");
    res.json({ code: 0, msg: "规则已更新", data: rule });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 切换启禁用
router.post("/toggle", requirePermission("qa_check"), async (req, res) => {
  try {
    const { id } = req.body;
    const rule = await QARule.findByPk(id);
    if (!rule) return res.json({ code: 1, msg: "规则不存在", data: null });
    rule.enabled = !rule.enabled;
    await rule.save();
    writeAuditLog(`质检规则 ID:${id} ${rule.enabled ? "启用" : "禁用"}`, "qa");
    res.json({ code: 0, msg: rule.enabled ? "已启用" : "已禁用", data: rule });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 删除规则
router.delete("/:id", requirePermission("qa_check"), async (req, res) => {
  await QARule.destroy({ where: { id: Number(req.params.id) } });
  writeAuditLog(`删除质检规则 ID:${req.params.id}`, "qa");
  res.json({ code: 0, msg: "规则已删除", data: null });
});

export default router;

import { Router } from "express";
import ModelConfig from "../db/models/ModelConfig";
import axios from "axios";
import { writeAuditLog } from "../utils/auditLogger";

const router = Router();

// 新增模型
router.post("/add", async (req, res) => {
  try {
    const cfg = await ModelConfig.create(req.body);
    res.json({ code: 0, msg: "模型配置新增成功", data: cfg });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 模型列表
router.get("/list", async (_req, res) => {
  const list = await ModelConfig.findAll();
  res.json({ code: 0, msg: "ok", data: list });
});

// 检查模型在线状态
router.post("/check/:id", async (req, res) => {
  try {
    const model = await ModelConfig.findByPk(Number(req.params.id));
    if (!model) return res.json({ code: 1, msg: "模型不存在", data: null });
    const resp = await axios.get(`${model.baseUrl}/models`, { timeout: 5000 });
    const online = resp.status === 200;
    writeAuditLog(`模型 ${model.alias} 在线状态检测: ${online ? "在线" : "离线"}`, "model");
    res.json({ code: 0, msg: online ? "模型在线" : "模型离线", data: { online } });
  } catch {
    res.json({ code: 0, msg: "模型离线", data: { online: false } });
  }
});

// 批量检查所有模型状态
router.get("/checkAll", async (_req, res) => {
  const models = await ModelConfig.findAll();
  const results = [];
  for (const m of models) {
    try {
      const resp = await axios.get(`${m.baseUrl}/models`, { timeout: 3000 });
      results.push({ id: m.id, alias: m.alias, online: resp.status === 200 });
    } catch {
      results.push({ id: m.id, alias: m.alias, online: false });
    }
  }
  res.json({ code: 0, msg: "ok", data: results });
});

// 删除模型
router.delete("/:id", async (req, res) => {
  await ModelConfig.destroy({ where: { id: Number(req.params.id) } });
  res.json({ code: 0, msg: "已删除该模型配置", data: null });
});

export default router;

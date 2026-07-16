import { Router, Request, Response } from "express";
import ModelConfig from "../db/models/ModelConfig";
import type { ApiResult } from "../types";

const router = Router();

router.post("/add", async (req: Request, res: Response<ApiResult<unknown>>) => {
  try {
    const cfg = await ModelConfig.create(req.body);
    res.json({ code: 0, msg: "模型配置新增成功", data: cfg });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

router.get("/list", async (_req: Request, res: Response<ApiResult<unknown>>) => {
  const list = await ModelConfig.findAll();
  res.json({ code: 0, msg: "ok", data: list });
});

router.delete("/:id", async (req: Request, res: Response<ApiResult<unknown>>) => {
  await ModelConfig.destroy({ where: { id: Number(req.params.id) } });
  res.json({ code: 0, msg: "已删除该模型配置", data: null });
});

export default router;

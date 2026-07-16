import { Router, Request, Response } from "express";
import Project from "../db/models/Project";
import { writeAuditLog } from "../utils/auditLogger";
import type { ApiResult } from "../types";

const router = Router();

// 新建项目
router.post("/create", async (req: Request, res: Response<ApiResult<Project>>) => {
  try {
    const { projectName, description } = req.body;
    const item = await Project.create({
      projectName,
      description,
      archived: false,
      archivePath: null
    });
    writeAuditLog(`创建项目 ${projectName} ID:${item.id}`, "project");
    res.json({ code: 0, msg: "创建成功", data: item });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 查询所有项目
router.get("/list", async (_req: Request, res: Response<ApiResult<Project[]>>) => {
  const list = await Project.findAll({ order: [["createdAt", "DESC"]] });
  res.json({ code: 0, msg: "ok", data: list });
});

// 单项目详情
router.get("/detail/:id", async (req: Request, res: Response<ApiResult<Project>>) => {
  const item = await Project.findByPk(Number(req.params.id));
  res.json({ code: 0, msg: item ? "ok" : "无数据", data: item });
});

export default router;

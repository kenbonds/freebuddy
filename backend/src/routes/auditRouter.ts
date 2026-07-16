import { Router, Request, Response } from "express";
import AuditRecord from "../db/models/AuditRecord";
import type { ApiResult } from "../types";

const router = Router();

router.get("/list", async (_req: Request, res: Response<ApiResult<unknown>>) => {
  const list = await AuditRecord.findAll({ order: [["createdAt", "DESC"]] });
  res.json({ code: 0, msg: "ok", data: list });
});

export default router;

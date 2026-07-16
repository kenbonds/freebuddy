import { Router, Request, Response } from "express";
import { archiveProject } from "../services/archiveService";
import type { ApiResult } from "../types";

const router = Router();

router.post("/doArchive", async (req: Request, res: Response<ApiResult<string>>) => {
  try {
    const { projectId } = req.body;
    const pathStr = await archiveProject(projectId);
    res.json({ code: 0, msg: "归档完成并锁定只读", data: pathStr });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

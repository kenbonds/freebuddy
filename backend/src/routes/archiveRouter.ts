import { Router } from "express";
import { archiveProject, checkArchiveConditions, getArchiveHistory } from "../services/archiveService";
import { exportProjectData } from "../services/exportService";
import { requirePermission } from "../middleware/permission";
import { writeAuditLog } from "../utils/auditLogger";

const router = Router();

// 检查归档条件
router.get("/check/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const conditions = await checkArchiveConditions(projectId);
    res.json({ code: 0, msg: "ok", data: conditions });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 执行归档（带条件校验）
router.post("/doArchive", requirePermission("project_archive"), async (req, res) => {
  try {
    const { projectId } = req.body;
    const pathStr = await archiveProject(projectId);
    writeAuditLog(`项目${projectId}执行完整归档`, "archive");
    res.json({ code: 0, msg: "归档完成并锁定只读", data: pathStr });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 查询归档历史
router.get("/history/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const history = await getArchiveHistory(projectId);
    res.json({ code: 0, msg: "ok", data: history });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

// 导出项目全量数据（溯源复盘）
router.get("/export/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const data = await exportProjectData(projectId);
    res.json({ code: 0, msg: "ok", data });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

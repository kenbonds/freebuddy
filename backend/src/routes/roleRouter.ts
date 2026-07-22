import { Router } from "express";
import Role from "../db/models/Role";
import { writeAuditLog } from "../utils/auditLogger";
import { requirePermission } from "../middleware/permission";

const router = Router();

// 获取所有角色
router.get("/list", async (_req, res) => {
  const list = await Role.findAll({ order: [["createdAt", "ASC"]] });
  res.json({ code: 0, msg: "ok", data: list });
});

// 更新角色权限
router.post("/update", requirePermission("role_manage"), async (req, res) => {
  try {
    const { id, permissions, description } = req.body;
    const role = await Role.findByPk(id);
    if (!role) return res.json({ code: 1, msg: "角色不存在", data: null });
    if (permissions) role.permissions = JSON.stringify(permissions);
    if (description) role.description = description;
    await role.save();
    writeAuditLog(`更新角色权限: ${role.roleName}`, "role");
    res.json({ code: 0, msg: "角色权限已更新", data: role });
  } catch (e) {
    res.json({ code: 1, msg: String(e), data: null });
  }
});

export default router;

import { Request, NextFunction } from "express";
import Role from "../db/models/Role";

/**
 * 权限检查中间件工厂
 * @param requiredPermission 需要的权限标识
 * @returns Express中间件
 */
export function requirePermission(requiredPermission: string) {
  return async (req: Request, res: any, next: NextFunction) => {
    try {
      // 从请求头获取角色名称（支持URL编码，默认使用第一个角色）
      const rawRole = req.headers["x-role"] as string;
      const roleName = rawRole ? decodeURIComponent(rawRole) : "架构规划员";
      const role = await Role.findOne({ where: { roleName } });
      if (!role) {
        return res.json({ code: 1, msg: "角色不存在，权限校验失败", data: null });
      }
      const permissions: string[] = JSON.parse(role.permissions || "[]");
      if (!permissions.includes(requiredPermission)) {
        return res.json({ code: 1, msg: `权限不足：${roleName} 缺少 ${requiredPermission} 权限`, data: null });
      }
      next();
    } catch (e) {
      res.json({ code: 1, msg: `权限校验异常: ${String(e)}`, data: null });
    }
  };
}

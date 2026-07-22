import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

/**
 * 角色表 — 四大核心角色权限配置
 */
interface RoleAttributes {
  id?: number;
  roleName: string;       // 角色名称：架构规划员/开发执行员/运维部署员/质检审核员
  permissions: string;     // JSON 权限列表：["ticket_assign","task_execute","review","qa_check","project_archive","log_view"]
  description: string;     // 角色描述
  createdAt?: Date;
  updatedAt?: Date;
}

class Role extends Model<RoleAttributes> implements RoleAttributes {
  public id!: number;
  public roleName!: string;
  public permissions!: string;
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    roleName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "[]"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "role",
    comment: "核心角色权限配置表"
  }
);

export default Role;

import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

/**
 * 质检规则表 — 自动化质检门禁规则
 */
interface QARuleAttributes {
  id?: number;
  ruleName: string;          // 规则名称
  ruleType: string;          // 规则类型：type_check/unit_test/security_scan/e2e_test/build_check
  severity: string;          // 严重级别：critical/major/minor
  enabled: boolean;          // 是否启用
  configJson: string;        // JSON 规则配置参数
  description: string;       // 规则描述
  createdAt?: Date;
  updatedAt?: Date;
}

class QARule extends Model<QARuleAttributes> implements QARuleAttributes {
  public id!: number;
  public ruleName!: string;
  public ruleType!: string;
  public severity!: string;
  public enabled!: boolean;
  public configJson!: string;
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QARule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ruleName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ruleType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    severity: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "major"
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    configJson: {
      type: DataTypes.TEXT,
      defaultValue: "{}"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "qa_rule",
    comment: "自动化质检门禁规则表"
  }
);

export default QARule;

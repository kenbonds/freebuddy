import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

/**
 * 质检报告表 — 工单执行后自动/手动触发质检流水线的结果记录
 */
interface QAReportAttributes {
  id?: number;
  ticketId: number;
  projectId: number;
  result: "pass" | "minor_issue" | "major_issue";
  summary: string;
  details: string;         // JSON 详细记录：每条规则的检查结果
  reportContent: string;   // 标准化质检报告全文（Markdown格式）
  triggeredBy: string;     // 触发方式：auto / manual
  createdAt?: Date;
  updatedAt?: Date;
}

class QAReport extends Model<QAReportAttributes> implements QAReportAttributes {
  public id!: number;
  public ticketId!: number;
  public projectId!: number;
  public result!: "pass" | "minor_issue" | "major_issue";
  public summary!: string;
  public details!: string;
  public reportContent!: string;
  public triggeredBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QAReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    result: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pass"
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "[]"
    },
    reportContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    },
    triggeredBy: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "auto"
    }
  },
  {
    sequelize,
    tableName: "qa_report",
    comment: "质检报告记录表"
  }
);

export default QAReport;

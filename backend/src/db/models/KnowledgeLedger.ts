import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

/**
 * 知识台账表 — 结构化三层知识体系
 */
interface KnowledgeLedgerAttributes {
  id?: number;
  projectId: number | null;      // 关联项目（null=公共知识）
  ticketId: number | null;       // 关联工单（null=项目/公共知识）
  knowledgeLevel: string;        // 层级：public/project/ticket
  title: string;                 // 知识标题
  content: string;               // 知识正文
  tags: string;                  // JSON 标签数组
  sourceType: string;            // 来源：manual_import/auto_extract/iteration
  reuseCount: number;            // 复用次数统计
  version: string;               // 版本号
  createdAt?: Date;
  updatedAt?: Date;
}

class KnowledgeLedger extends Model<KnowledgeLedgerAttributes> implements KnowledgeLedgerAttributes {
  public id!: number;
  public projectId!: number | null;
  public ticketId!: number | null;
  public knowledgeLevel!: string;
  public title!: string;
  public content!: string;
  public tags!: string;
  public sourceType!: string;
  public reuseCount!: number;
  public version!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

KnowledgeLedger.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    knowledgeLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "public"
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tags: {
      type: DataTypes.TEXT,
      defaultValue: "[]"
    },
    sourceType: {
      type: DataTypes.STRING,
      defaultValue: "manual_import"
    },
    reuseCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: "v1.0"
    }
  },
  {
    sequelize,
    tableName: "knowledge_ledger",
    comment: "知识台账表（三层分级架构）"
  }
);

export default KnowledgeLedger;

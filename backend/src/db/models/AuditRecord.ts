import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

interface AuditRecordAttributes {
  id?: number;
  logType: string;
  content: string;
  timestamp: string;
  operator: string;
  entityType: string;
  entityId: number | null;
  detail: string;
  prevHash: string;
  createdAt?: Date;
}

class AuditRecord extends Model<AuditRecordAttributes> implements AuditRecordAttributes {
  public id!: number;
  public logType!: string;
  public content!: string;
  public timestamp!: string;
  public operator!: string;
  public entityType!: string;
  public entityId!: number | null;
  public detail!: string;
  public prevHash!: string;
  public readonly createdAt!: Date;
}

AuditRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    logType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.STRING,
      allowNull: false
    },
    operator: {
      type: DataTypes.STRING,
      defaultValue: "system"
    },
    entityType: {
      type: DataTypes.STRING,
      defaultValue: ""
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    detail: {
      type: DataTypes.TEXT,
      defaultValue: ""
    },
    prevHash: {
      type: DataTypes.STRING,
      defaultValue: ""
    }
  },
  {
    sequelize,
    tableName: "audit_record"
  }
);

export default AuditRecord;

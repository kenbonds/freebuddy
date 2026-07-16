import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

interface AuditRecordAttributes {
  id?: number;
  logType: string;
  content: string;
  timestamp: string;
  createdAt?: Date;
}

class AuditRecord extends Model<AuditRecordAttributes> implements AuditRecordAttributes {
  public id!: number;
  public logType!: string;
  public content!: string;
  public timestamp!: string;
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
    }
  },
  {
    sequelize,
    tableName: "audit_record"
  }
);

export default AuditRecord;

import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";
import type { TicketStatus, AgentRole } from "../../types";

interface TicketAttributes {
  id?: number;
  projectId: number;
  title: string;
  content: string;
  status: TicketStatus;
  assignRole: AgentRole | null;
  parentTicketId: number | null;
  priority: string;
  goalId: number | null;
  timeline: string;
  finishedAt: Date | null;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Ticket extends Model<TicketAttributes> implements TicketAttributes {
  public id!: number;
  public projectId!: number;
  public title!: string;
  public content!: string;
  public status!: TicketStatus;
  public assignRole!: AgentRole | null;
  public parentTicketId!: number | null;
  public priority!: string;
  public goalId!: number | null;
  public timeline!: string;
  public finishedAt!: Date | null;
  public deletedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Ticket.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "待认领"
    },
    assignRole: {
      type: DataTypes.STRING,
      allowNull: true
    },
    parentTicketId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: "P3"
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    timeline: {
      type: DataTypes.TEXT,
      defaultValue: "[]"
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "ticket"
  }
);

export default Ticket;

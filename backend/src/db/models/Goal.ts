import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

export interface GoalAttributes {
  id?: number;
  projectId: number;
  ticketId: number | null;
  parentGoalId: number | null;
  title: string;
  description: string;
  status: "active" | "completed" | "deviated";
  matchScore: number;
  deviationReason: string;
  achievedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Goal extends Model<GoalAttributes> implements GoalAttributes {
  public id!: number;
  public projectId!: number;
  public ticketId!: number | null;
  public parentGoalId!: number | null;
  public title!: string;
  public description!: string;
  public status!: "active" | "completed" | "deviated";
  public matchScore!: number;
  public deviationReason!: string;
  public achievedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Goal.init(
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
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parentGoalId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active"
    },
    matchScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    deviationReason: {
      type: DataTypes.TEXT,
      defaultValue: ""
    },
    achievedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "goal"
  }
);

export default Goal;

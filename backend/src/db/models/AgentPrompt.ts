import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";
import type { AgentRole } from "../../types";

interface AgentPromptAttributes {
  id?: number;
  role: AgentRole;
  promptContent: string;
  versionTag: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class AgentPrompt extends Model<AgentPromptAttributes> implements AgentPromptAttributes {
  public id!: number;
  public role!: AgentRole;
  public promptContent!: string;
  public versionTag!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AgentPrompt.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    promptContent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    versionTag: {
      type: DataTypes.STRING,
      defaultValue: "v1.0-base"
    }
  },
  {
    sequelize,
    tableName: "agent_prompt"
  }
);

export default AgentPrompt;

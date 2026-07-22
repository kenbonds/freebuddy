import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

export interface ChatSessionAttributes {
  id?: number;
  title: string;
  scene: string;
  projectId: number | null;
  ticketId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class ChatSession extends Model<ChatSessionAttributes> implements ChatSessionAttributes {
  public id!: number;
  public title!: string;
  public scene!: string;
  public projectId!: number | null;
  public ticketId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChatSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "新对话"
    },
    scene: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "general"
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "chat_session"
  }
);

export default ChatSession;

import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

export interface ChatMessageAttributes {
  id?: number;
  sessionId: number;
  role: "user" | "assistant" | "system";
  content: string;
  modelId: number | null;
  createdAt?: Date;
}

class ChatMessage extends Model<ChatMessageAttributes> implements ChatMessageAttributes {
  public id!: number;
  public sessionId!: number;
  public role!: "user" | "assistant" | "system";
  public content!: string;
  public modelId!: number | null;
  public readonly createdAt!: Date;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "chat_message"
  }
);

export default ChatMessage;

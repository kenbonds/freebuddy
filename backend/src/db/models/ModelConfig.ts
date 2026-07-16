import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

interface ModelConfigAttributes {
  id?: number;
  alias: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isLocal: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ModelConfig extends Model<ModelConfigAttributes> implements ModelConfigAttributes {
  public id!: number;
  public alias!: string;
  public baseUrl!: string;
  public apiKey!: string;
  public modelName!: string;
  public isLocal!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ModelConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    alias: {
      type: DataTypes.STRING,
      allowNull: false
    },
    baseUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    modelName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isLocal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: "model_config"
  }
);

export default ModelConfig;

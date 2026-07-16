import { DataTypes, Model } from "sequelize";
import { sequelize } from "../init";

interface ProjectAttributes {
  id?: number;
  projectName: string;
  description: string;
  archived: boolean;
  archivePath: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Project extends Model<ProjectAttributes> implements ProjectAttributes {
  public id!: number;
  public projectName!: string;
  public description!: string;
  public archived!: boolean;
  public archivePath!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    archivePath: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "project"
  }
);

export default Project;

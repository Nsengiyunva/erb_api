import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ERBUser extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
}

ERBUser.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "erb_user"
  }
);

import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ERBEngineer extends Model {
  public id!: number;
  public reg_date!: Date;
  public organisation!: string;
  public reg_no!: string;
  public country!: string;
  public name!: string;
  public gender!: string;
  public field!: string;
  public address!: string;
  public phones!: string;
  public emails!: string;
  public uipe_number!: string;
  public qualification!: string;
}

ERBEngineer.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    reg_date: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    organisation: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    country: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    reg_no: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    field: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    phones: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Comma-separated list of phone numbers",
    },

    emails: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Comma-separated list of emails",
    },

    uipe_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "erb_engineer",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

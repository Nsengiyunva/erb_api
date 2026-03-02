import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ERBWed extends Model {
  public id!: number;
  public reg_no!: string;
  public name!: string;
  public email_address!: string;
  public category!: string;
  public email_status!: string;
  public purpose!: string;
  public receipt_date!: string;
  public amount_paid!: string;
  public year_paid!: string;
}

ERBWed.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    reg_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    email_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    category: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount_paid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_date: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    year_paid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_document: {
        type: DataTypes.STRING,
        allowNull: true,
    }
  },
  {
    sequelize,
    tableName: "erb_wed_list",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

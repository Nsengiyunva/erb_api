import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ERBPaid extends Model {
  public id!: number;
  public record_no!: string;
  public reg_no!: string;
  public name!: string;
  public specialization!: string;
  public license_no!: string;
  public email_address!: string;
  public base_field!: string;
  public issue_date!: string;
  public period!: string;
  public email_status!: string;
  public purpose!: string;
  public amount_paid!: string;
  public year_paid!: string;
}

ERBPaid.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    record_no: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    reg_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    license_no: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    base_field: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    issue_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    period: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount_paid: {
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
  },
  {
    sequelize,
    tableName: "erb_paid_list",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

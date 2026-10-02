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
  public primary_email!: string | null;
  public secondary_email!: string | null;
  public primary_contact!: string | null;
  public secondary_contact!: string | null;
  public photo!: string | null;
  public type!: string | null;
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
      allowNull: true,
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

    // These were accepted by the add/edit/import endpoints but were never
    // declared on the model, so Sequelize silently dropped them on every
    // save (type always "Not set", contacts never stored). The columns are
    // created on startup if missing — see ensureEngineerColumns().
    primary_email:     { type: DataTypes.STRING, allowNull: true },
    secondary_email:   { type: DataTypes.STRING, allowNull: true },
    primary_contact:   { type: DataTypes.STRING, allowNull: true },
    secondary_contact: { type: DataTypes.STRING, allowNull: true },
    photo:             { type: DataTypes.STRING(500), allowNull: true },
    type:              { type: DataTypes.STRING(30), allowNull: true },


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

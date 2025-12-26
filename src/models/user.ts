import { DataTypes, Model } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../config/database";

export class User extends Model {
  public id!: number;
  public email!: string;
  public password!: string;

  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },

    first_name: DataTypes.STRING,
    surname: DataTypes.STRING,
    other_names: DataTypes.STRING,
    telephone: DataTypes.STRING,
    dob: DataTypes.STRING,
    gender: DataTypes.STRING,
    company_name: DataTypes.STRING,
    address: DataTypes.STRING,
    status: DataTypes.STRING,
    user_type: DataTypes.STRING,
    country: DataTypes.STRING,
    type: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    birth_place: DataTypes.STRING,
    licence_no: DataTypes.STRING,
    registered: DataTypes.STRING,
    category: DataTypes.STRING,
    name: DataTypes.STRING,
    belongs_to: DataTypes.STRING,
    last_name: DataTypes.STRING,
    phone_no: DataTypes.STRING,
    origin_license_no: DataTypes.STRING,

    // user_picture: {
    //   type: DataTypes.TEXT
    // },

    password: {
      type: DataTypes.STRING
    }
  },
  {
    sequelize,
    tableName: "user_engineer",
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  }
);

import { DataTypes, Model } from 'sequelize';
import { sequelize } from "../config/database";
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  id?: number;
  first_name: string;
  surname: string;
  other_names: string;
  telephone: string;
  dob: string;
  gender: string;
  company_name: string;
  address: string;
  password: string;
  country: string;
  created_at?: Date;
  updated_at?: Date;
  type: string;
  email: string;
  birth_place: string;
  licence_no: string;
  belongs_to: string;
  last_name: string;
  phone_no: string;
  registered: string;
  category: string;
  name: string;
  status: string;
  user_type: string;
}

class OldUser extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public first_name!: string;
  public surname!: string;
  public other_names!: string;
  public telephone!: string;
  public dob!: string;
  public gender!: string;
  public company_name!: string;
  public address!: string;
  public password!: string;
  public country!: string;
  public created_at!: Date;
  public updated_at!: Date;
  public type!: string;
  public email!: string;
  public birth_place!: string;
  public licence_no!: string;
  public belongs_to!: string;
  public last_name!: string;
  public phone_no!: string;
  public registered!: string;
  public category!: string;
  public name!: string;
  public status!: string;
  public user_type!: string;

  public async comparePassword(password: string): Promise<boolean> {
      return bcrypt.compare(password, this.password);
    }
}

OldUser.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    first_name: DataTypes.STRING,
    surname: DataTypes.STRING,
    other_names: DataTypes.STRING,
    telephone: DataTypes.STRING,
    dob: DataTypes.STRING,
    gender: DataTypes.STRING,
    company_name: DataTypes.STRING,
    address: DataTypes.STRING,
    password: DataTypes.STRING,
    country: DataTypes.STRING,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    type: DataTypes.STRING,
    email: DataTypes.STRING,
    birth_place: DataTypes.STRING,
    licence_no: DataTypes.STRING,
    belongs_to: DataTypes.STRING,
    last_name: DataTypes.STRING,
    phone_no: DataTypes.STRING,
    registered: DataTypes.STRING,
    category: DataTypes.STRING,
    name: DataTypes.STRING,
    status: DataTypes.STRING,
    user_type: DataTypes.STRING,
  },
  {
    sequelize,
    tableName: 'old_users',
    timestamps: false,
  }
);

export default OldUser;

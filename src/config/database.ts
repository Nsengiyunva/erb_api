import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "erbdb",
  "erbadmin",
  "admin@NSE#256",
  {
    host: "127.0.0.1",
    dialect: "mysql"
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("ERB Database connected");

    await sequelize.sync({ alter: true });
    console.log("All ERB Models synchronized...");

  } catch (error) {
    console.error("Unable to start server:", error);
  }
};

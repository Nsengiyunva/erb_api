import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "erbdb",
  "erbadmin",
  "admin@NSE#256",
  {
    host: "127.0.0.1",
    dialect: "mysql",
    logging: false, // disable SQL logs in production
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      freezeTableName: true, // prevent pluralization
      underscored: true,     // use snake_case columns
    },
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("ERB Database connected");

    // await sequelize.sync({ alter: true });
    // console.log("All ERB Models synchronized...");

  } catch (error) {
    console.error("Unable to start server:", error);
  }
};

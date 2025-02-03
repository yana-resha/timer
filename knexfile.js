require("dotenv").config();
/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */

console.log( process.env.DB_PORT, '222', process.env.PASSWORD)
module.exports = {
  client: "mysql",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
  },
  migrations: {
    tableName: "knex_migrations",
  }
};



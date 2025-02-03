/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("sessions", (table) => {
        table.increments("id")
        table.integer("user_id").unsigned().notNullable().references("users.id")
        table.string("session_id").notNullable().unique()
      })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable("sessions")
};

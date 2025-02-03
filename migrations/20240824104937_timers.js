/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("timers", (table) => {
        table.increments("id")
        table.integer("user_id").unsigned().notNullable().references("users.id")
        table.string("description", 255).notNullable()
        table.dateTime('start').notNullable().defaultTo(knex.fn.now())
        table.dateTime('end')
        table.boolean('is_active').defaultTo(true)
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable("timers")
};
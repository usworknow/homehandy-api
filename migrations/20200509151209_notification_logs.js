
exports.up = async function(knex, Promise) {
    await knex.schema.createTable('notification_logs', (table) => {
      table.increments('id')
      table.uuid('user_id').references('users.id')
      table.string('type')
      table.jsonb('data')
      table.boolean('read').notNullable().defaultTo(false)
      table.timestamp('issued_at').defaultTo(knex.fn.now())
    })
  };
  
exports.down = async function(knex, Promise) {
    await knex.schema.dropTable('notification_logs')
};
  
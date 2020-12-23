
exports.up = async function (knex) {
    await knex.schema.createTable('auth_tokens', function (table) {
      table.uuid('token').primary().notNullable()
      table.uuid('user_id').references('users.id').onDelete('CASCADE')
      table.datetime('expires').notNullable()
    })
  }
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('auth_tokens')
  }
  
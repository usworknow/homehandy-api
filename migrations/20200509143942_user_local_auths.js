
exports.up = async function (knex) {
    await knex.schema.createTable('user_local_auths', function (table) {
      table.uuid('user_id').primary().references('users.id').onDelete('CASCADE')
      table.string('password_hash')
      table.string('reset_token')
    })
}
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('user_local_auths')
  }
  
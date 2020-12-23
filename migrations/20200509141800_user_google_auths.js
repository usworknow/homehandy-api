
exports.up = async function (knex) {
    await knex.schema.createTable('user_google_auths', function (table) {
      table.uuid('user_id').primary().references('users.id')
      table.string('google_id')
      table.string('access_token')
      table.text('id_token')
    })
  }
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('user_google_auths')
  }
  
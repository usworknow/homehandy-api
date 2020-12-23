
exports.up = async function (knex) {

    await knex.schema.createTable('user_requests', function (table) {
        table.increments('id')
        table.uuid('user_id').references('users.id').onDelete('CASCADE')
        table.string('data_type')
        table.string('data_value')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('user_requests')
}

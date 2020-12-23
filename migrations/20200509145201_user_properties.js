
exports.up = async function (knex) {

    await knex.schema.createTable('user_properties', function (table) {
        table.increments('id')
        table.uuid('user_id').references('users.id').onDelete('CASCADE')
        table.uuid('property_id').references('properties.id').onDelete('CASCADE')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('user_properties')
}

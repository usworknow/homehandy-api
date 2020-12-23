
exports.up = async function (knex) {

    await knex.schema.createTable('property_services', function (table) {
        table.increments('id')
        table.uuid('property_id').references('properties.id').onDelete('CASCADE')
        table.integer('service_id').references('services.id').onDelete('CASCADE')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('property_services')
}

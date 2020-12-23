
exports.up = async function (knex) {

    await knex.schema.createTable('company_service_areas', function (table) {
        table.increments('id')
        table.uuid('company_id').references('companies.id').onDelete('CASCADE')
        table.string('place_id')
        table.string('description')
        table.decimal('lat', 8, 6)
        table.decimal('lng', 9, 6)
        table.decimal('radius')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('company_service_areas')
}

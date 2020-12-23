
exports.up = async function (knex) {

    await knex.schema.createTable('company_services', function (table) {
        table.increments('id')
        table.uuid('company_id').references('companies.id').onDelete('CASCADE')
        table.integer('service_id').references('services.id').onDelete('CASCADE')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('company_services')
}

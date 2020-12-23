
exports.up = async function (knex) {

    await knex.schema.createTable('service_package_inclusions', function (table) {
        table.increments('id')
        table.uuid('service_package_id').references('service_packages.id').onDelete('CASCADE')
        table.integer('service_inclusion_id').references('service_inclusions.id').onDelete('CASCADE')
        table.integer('frequency_id')
        table.string('value')
        table.decimal('price')
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('service_package_inclusions')
}

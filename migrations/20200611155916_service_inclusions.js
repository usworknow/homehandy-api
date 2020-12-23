
exports.up = async function (knex) {

    await knex.schema.createTable('service_inclusions', function (table) {
        table.increments('id')
        table.integer('service_id').references('services.id').notNullable()
        table.string('inclusion_type').notNullable()
        table.string('label').notNullable()
        table.string('description')
        table.boolean('has_frequency').notNullable().defaultTo(false)
        table.boolean('has_price').notNullable().defaultTo(false)
        table.boolean('has_value').notNullable().defaultTo(false)
        table.boolean('approved').notNullable().defaultTo(true)
    })
  }
    
  exports.down = async function (knex) {
    await knex.schema.dropTable('service_inclusions')
  }

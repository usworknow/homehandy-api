
exports.up = async function (knex) {

    await knex.schema.createTable('service_packages', function (table) {
        table.uuid('id').primary()
        table.uuid('company_id').references('companies.id').notNullable()
        table.integer('service_id').references('services.id').notNullable()
        table.string('name').notNullable()
        table.string('icon')
        table.string('description')
        table.decimal('price')
        table.integer('billing_cycle')
        table.boolean('is_paused').notNullable().defaultTo(false)
        table.datetime('paused_at')
        table.datetime('reactivate_at')
        table.datetime('archived_at')
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
  }
    
  exports.down = async function (knex) {
    await knex.schema.dropTable('service_packages')
  }
    
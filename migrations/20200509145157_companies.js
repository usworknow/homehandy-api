
exports.up = async function (knex) {

  await knex.schema.createTable('companies', function (table) {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.string('description')
      table.string('dba')
      table.string('stripe_id')
      table.string('logo')
      table.string('phone')
      table.string('address')
      table.string('address2')
      table.string('city')
      table.string('state')
      table.string('country')
      table.string('postcode')
      table.string('website')
      table.boolean('is_paused').notNullable().defaultTo(false)
      table.datetime('paused_at')
      table.datetime('deactivate_at')
      table.datetime('archived_at')
      table.datetime('created_at').defaultTo(knex.fn.now())
  })
}
  
exports.down = async function (knex) {
  await knex.schema.dropTable('companies')
}
  
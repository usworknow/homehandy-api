
exports.up = async function (knex) {

    await knex.schema.createTable('frequencies', function (table) {
        table.integer('id').primary()
        table.string('label').notNullable()
        table.string('description')
    })
  }
    
  exports.down = async function (knex) {
    await knex.schema.dropTable('frequencies')
  }
    
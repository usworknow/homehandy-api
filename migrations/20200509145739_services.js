exports.up = async function(knex) {
    await knex.schema.createTable('services', function (table) {
      table.increments('id')
      table.string('label')
      table.boolean('approved').notNullable().defaultTo(true)
    })
};
  
exports.down = async function(knex) {
    await knex.schema.dropTable('services')
};
  
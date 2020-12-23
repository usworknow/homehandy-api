
exports.up = async function (knex) {

    await knex.schema.createTable('user_companies', function (table) {
        table.increments('id')
        table.uuid('user_id').references('users.id').onDelete('CASCADE')
        table.uuid('company_id').references('companies.id').onDelete('CASCADE')
        table.string('role').notNullable().defaultTo('owner')
    })
}
  
exports.down = async function (knex) {
    await knex.schema.dropTable('user_companies')
}
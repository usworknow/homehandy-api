
exports.up = async function(knex) {
    await knex.schema.createTable('company_hours', function (table) {
        table.increments('id')
        table.uuid('company_id').references('companies.id').notNullable().onDelete('CASCADE')
        table.string('opens')
        table.string('closes')
        table.integer('day_of_week')
        table.datetime('valid_from')
        table.datetime('valid_thru')
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('company_hours')
};

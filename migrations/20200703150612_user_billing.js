
exports.up = async function(knex) {
    await knex.schema.createTable('user_billing', function (table) {
        table.uuid('id').primary()
        table.uuid('user_id').references('users.id').onDelete('CASCADE')
        table.string('first_name')
        table.string('last_name')
        table.string('phone')
        table.string('address')
        table.string('address2')
        table.string('city')
        table.string('state')
        table.string('postcode')
        table.string('country')
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('user_billing')
};

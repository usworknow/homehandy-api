
exports.up = async function(knex) {
    await knex.schema.createTable('users', function (table) {
        table.uuid('id').primary()
        table.string('email').notNullable()
        table.string('first_name')
        table.string('last_name')
        table.string('phone')
        table.string('address')
        table.string('address2')
        table.string('city')
        table.string('state')
        table.string('postcode')
        table.string('country')
        table.string('dob')
        table.string('profile_image')
        table.string('default_profile').defaultTo('customer')
        table.boolean('is_paused').notNullable().defaultTo(false)
        table.datetime('consent_at')
        table.datetime('paused_at')
        table.datetime('deactivate_at')
        table.datetime('archived_at')
        table.datetime('last_login_at').defaultTo(knex.fn.now())
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('users')
};


exports.up = async function(knex) {
    await knex.schema.createTable('properties', function (table) {
        table.uuid('id').primary()
        table.string('property_type')
        table.string('property_size')
        table.string('property_beds')
        table.string('property_baths')
        table.string('address')
        table.string('address2')
        table.string('city')
        table.string('state')
        table.string('country')
        table.string('postcode')
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('properties')
};

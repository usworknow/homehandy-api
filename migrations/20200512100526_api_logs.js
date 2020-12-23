exports.up = async function(knex) {
    await knex.schema.createTable('api_logs', function (table) {
        table.increments('id')
        table.uuid('user_id')
        table.integer('status_code')
        table.string('method')
        table.string('url')
        table.jsonb('params')
        table.jsonb('req_body')
        table.jsonb('res_body')
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('api_logs')
};
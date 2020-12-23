
exports.up = async function (knex) {
    await knex.schema.createTable('user_verifications', function (table) {
        table.increments('id')
        table.uuid('user_id').references('users.id').onDelete('CASCADE')
        table.string('reporting_reference')
        table.boolean('safe_harbour')
        table.integer('status')
        table.boolean('verified')
        table.string('safe_harbour_score')
        table.jsonb('verification_response')
        table.datetime('created_at').defaultTo(knex.fn.now())
    })
  }
  
exports.down = async function (knex) {
    await knex.schema.dropTable('user_verifications')
}

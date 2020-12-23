const { hash } = require('../src/utilities/authenticate.js')
const config = require('config')
const { v4: uuidv4 } = require('uuid')

module.exports.seed = async function (knex, Promise) {
  
  const superuser = config.get('superuser')
  const superpassword = config.get('superpassword')
  
  const admin = await knex('users').where({ email: superuser }).first()

  if (admin != null) return console.info('Seed data not loaded. Admin exists.')

  const id = uuidv4()
  await knex('users').insert(
    [{ id: id, email: superuser, first_name: 'Admin', last_name: 'User', default_profile: 'admin' }]
  )
  await knex('user_local_auths').insert(await userHash({ user_id: id, password: superpassword }))

  console.info('Seed data loaded.')
}

const userHash = async ({ user_id, password }) => {
  const passwordHash = await hash(password)
  return { user_id, password_hash: passwordHash }
}

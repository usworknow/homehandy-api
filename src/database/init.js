const path = require('path')
let interval

module.exports.init = async () => {
  const { db } = require('./connection.js')
  await db.migrate.latest().then(() => db.seed.run({ directory: path.join(__dirname, '/../../seeds/') }))

  interval = setInterval(() => {
    db('auth_tokens').where('expires', '<', 'NOW()').del()
  }, 1 * 60 * 60 * 1000)
}

module.exports.teardown = async () => {
  const { db } = require('./connection.js')
  clearInterval(interval)
  await db.destroy()
}

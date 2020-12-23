const config = require('config')

const knexConfig = {
  client: 'pg',
  connection: {
    host: config.get('dbHost'),
    port: config.get('dbPort'),
    user: config.get('dbUser'),
    password: config.get('dbPassword'),
    database: config.get('db'),
    timezone: 'utc'
  },
  // debug: true,
  pool: {
    min: 2,
    max: 30,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false
  }
}

const knex = require('knex')(knexConfig)

module.exports.db = knex

module.exports.TX = () => new Promise((resolve, reject) => knex.transaction.bind(knex)(resolve).catch(reject))

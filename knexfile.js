// Update with your config settings to make the global CLI work.
const config = require('config')
const path = require('path')

module.exports = {

  localhost: {
    client: 'postgresql',
    connection: {
      host: config.get('dbHost'),
      port: config.get('dbPort'),
      user: config.get('dbUser'),
      password: config.get('dbPassword'),
      database: config.get('db')
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
    },
    debug: true,
    migrations: {
      directory: path.join(__dirname, '/migrations'),
      tableName: 'knex_migrations'
    }
  },
  dev:  {
    client: 'postgresql',
    connection: {
      host: config.get('dbHost'),
      port: config.get('dbPort'),
      user: config.get('dbUser'),
      password: config.get('dbPassword'),
      database: config.get('db')
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
    },
    debug: true,
    migrations: {
      directory: path.join(__dirname, '/migrations'),
      tableName: 'knex_migrations'
    }
  },
}

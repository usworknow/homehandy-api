const express = require('express')
const app = express()
const config = require('config')

const init = async () => {

  process.env.CLOUDINARY_URL = process.env.CLOUDINARY_URL || config.get('cloudinary')

  console.info('Starting middleware')
  require('./middleware/middleware.js')(app)

  console.info('Connecting database')
  app.db = await require('./database/init.js').init()

  console.info('Enabling routes')
  require('./routes')(app)

  console.info('Adding error trapper')
  require('./middleware/errorTrapper.js')(app)

  return app
}

module.exports = init()

const morgan = require('morgan')

const cors = require('cors')
const helmet = require('helmet')
const bodyParser = require('body-parser')

const expressWs = require('express-ws');
const mung = require('express-mung')
const {logger} = require('./logger')
module.exports = (app) => {

  expressWs(app)
  
  // log to console
  app.use(helmet())
  app.use(cors())
  app.use(bodyParser.json({ type: 'json', limit: '5mb' }))
  app.use(morgan('short'))
  if (process.env.NODE_ENV !== 'test') { 
    app.use(mung.jsonAsync(logger, { mungError: true }))
  }
  
  app.use((req, res, next) => {
    if (req.params.email) req.params.email = req.params.email.toLowerCase()
    if (req.body.email && typeof req.body.email === 'string') { req.body.email = req.body.email.toLowerCase() }
    next()
  })
}

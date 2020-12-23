
const config = require('config')

module.exports = (app) => {
  // error handlers
  // development error handler
  // will print stacktrace
  if (config.util.getEnv('NODE_ENV') === 'localhost') {
    app.use(function (err, req, res, next) {
      console.log('****LOCAL ERROR HANDLER****\n', err)
      return res.status(500).json({ error: 500, code: 'SYSTEM_ERROR', msg: err.message, data: err })
    })
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    console.log('****ERROR HANDLER****\n', err)
    return res.status(500).json({ error: 500, code: 'SYSTEM_ERROR', msg: err.message, data: err })
  })
}

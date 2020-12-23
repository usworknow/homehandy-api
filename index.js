var config = require('config')

process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit()
}) // Debugging promises

require('./src/app.js')
  .then(app => {
    const port = process.env.PORT || 8095
    const mode = config.util.getEnv('NODE_ENV')
    app.listen(port, () => {
      process.env.UPTIME = new Date()
      console.info('Server Started on port %d in %s mode', port, mode)
      console.info(new Date().toLocaleString())
    })
  })

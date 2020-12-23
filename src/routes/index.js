const apiV1 = require('./api_v1')

module.exports = (app) => {
  app.get('/ping', async (req, res) => {
    const version = require('../../package.json').version
    res.json({ version, live: new Date(Date.now()) })
  })

  app.use('/api/v1', apiV1)

  app.use((req, res) => {
    res.status(404).json({ error: 404, code: 'NOT_FOUND', msg: 'Not found.' })
  })
}

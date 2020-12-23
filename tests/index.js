// const test = require('tape')
const testAsync = require('tape-async')
const request = require('supertest')
const config = require('config')
process.on('unhandledRejection', (err) => {
  console.error(err)
  console.error(err.stack)
  process.exit()
}); // Debugging promises

(async () => {
  const app = await require('../src/app.js')

  testAsync('Sanity Check', async (t) => {
    const result = await request(app)
      .get('/ping')
      .send()
      .expect(200)
    t.assert(result.body.version, 'Returns Version')
    t.assert(result.ok, 'Success')
  })
  testAsync('Root Locked Down', async (t) => {
    const result = await request(app)
      .get('/')
      .send()
      .expect(404)
    t.assert(result.body.error, 'Returns error')
    t.assert(result.body.msg, 'Returns message')
  })

  const tokens = {}
  let customerId = ''
  testAsync('Admin Login', async (t) => {
    const result = await request(app)
      .post('/api/v1/users/local')
      .send({ email: config.get('superuser'), password: config.get('superpassword') })
      .expect(200)
    t.error(result.body.error, 'No Errors')
    t.ok(result.body.id, 'User Id provided')
    t.ok(result.body.email, 'Email provided')
    t.ok(result.body.default_profile, 'Role provided')
    tokens.admin = result.body.token
    customerId = result.body.id
    t.ok(tokens.admin.startsWith('Bearer '), 'Bearer Token received')
    t.equal(tokens.admin.length, 7 + 36, 'Token Length Correct')
  })

  testAsync('Failed Login - bad credentials', async (t) => {
    const result = await request(app)
      .post('/api/v1/users/local')
      .send({ email: "baduser", password: "badpassword" })
      .expect(401)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 401, 'Unauthorized')
  })

  testAsync('Failed Login - no credentials', async (t) => {
    const result = await request(app)
      .post('/api/v1/users/local')
      .send({email: '', password: ''})
      .expect(401)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 401, 'Unauthorized')
  })

  testAsync('Send Password Reset Request', async (t) => {
    const result = await request(app)
      .post('/api/v1/users/local/reset/' + config.get('superuser'))
      .expect(200)
    t.error(result.body.error, 'No Errors')
    tokens.reset = result.body.reset_token
    t.equal(tokens.reset.length, 36, 'Token Length Correct')
  })

  testAsync('Failed Password Reset Request', async (t) => {
    const result = await request(app)
      .post('/api/v1/users/local/reset/' + 'baduser@email.com')
      .expect(401)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 401, 'Unauthorized')
  })

  testAsync('Failed Update Password - Invalid password', async (t) => {
    const result = await request(app)
      .put('/api/v1/users/local/reset/' + config.get('superuser'))
      .send({ reset_token: tokens.reset, new_password: 'abc' })
      .expect(403)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 403, 'Bad Request')
  })

  testAsync('Failed Update Password - Invalid user', async (t) => {
    const result = await request(app)
      .put('/api/v1/users/local/reset/' + 'foo@bar.com')
      .send({ reset_token: tokens.reset, new_password: config.get('superpassword') })
      .expect(403)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 403, 'Bad Request')
  })

  testAsync('Failed Update Password - No credentials', async (t) => {
    const result = await request(app)
      .put('/api/v1/users/local/reset/' + 'foo@bar.com')
      .send({})
      .expect(403)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 403, 'Bad Request')
  })
  testAsync('Failed Update Password - No token', async (t) => {
    const result = await request(app)
      .put('/api/v1/users/local/reset/' + 'foo@bar.com')
      .send({new_password: config.get('superpassword')})
      .expect(403)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 403, 'Bad Request')
  })

  testAsync('Update Password', async (t) => {
    const result = await request(app)
      .put('/api/v1/users/local/reset/' + config.get('superuser'))
      .send({ reset_token: tokens.reset, new_password: config.get('superpassword') })
      .expect(200)
    t.error(result.body.error, 'No Errors')
    t.equal(result.body.email, config.get('superuser'), 'Correct user returned')
    t.ok(result.body.id, 'User Id provided')
    t.ok(result.body.default_profile, 'Role provided')
    t.ok(result.body.token.startsWith('Bearer '), 'Bearer Token received')
  })

  require('./register.js')(app)
  require('./references.js')(app, tokens)

  // switch (process.env.MODULE) {
  //   case 'posts':
  //     require('./posts.js')(app)
  //     break
  //   case 'profiles':
  //     require('./users_and_profiles.js')(app, tokens)
  //     break
  //   case 'chat':
  //     require('./chat.js')(app)
  //     break
  //   case 'groups':
  //     require('./groups.js')(app)
  //     break
  //   case 'social':
  //     require('./social_net.js')(app)
  //     break
  //   default:
  //     // require('./users_and_profiles.js')(app, tokens)
  //     // require('./social_net.js')(app)
  //     // require('./posts.js')(app)
  //     // require('./clubs_and_courses.js')(app)
  //     // require('./chat.js')(app);
  //     // require('./groups.js')(app);
  //     // require('./introductions.js')(app, tokens);
  // }

  testAsync('Teardown', async (t) => {
    const db = require('../src/database/init.js')
    await db.teardown().then(() => {
      t.pass('Database Closed')
    })
  })
    // const email = require('../src/util/email.js')
    // email.teardown((isClosed) => {
    //   t.ok(isClosed, "Email Closed")
    // })
    // const sse = require('../src/routes/api_v1/realtime')
    // sse.teardown((isClosed) => {
    //   t.ok(isClosed, "Realtime Closed")
    // })

  testAsync.onFinish(function () {
    process.exit(0)
  })
})()

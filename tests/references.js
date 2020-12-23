const testAsync = require('tape-async')
const request = require('supertest')

module.exports = (app, tokens) => {

  testAsync('Services requires Authorization', async (t) => {
    const result = await request(app)
      .get('/api/v1/services')
      .expect(401)
    t.ok(result.body.error, 'Error Thrown')
    t.ok(result.body.msg, 'Message provided')
    t.equal(result.body.error, 401, 'Bad Request')
  })
    testAsync('Get Services', async (t) => {
      const result = await request(app)
        .get('/api/v1/services')
        .set('Authorization', tokens.admin)
        .expect(200)
      t.error(result.body.error, 'No Errors')
      t.ok(result.body.length > 0, 'Records returned')
      t.ok(result.body[0].id, 'Record id returned')
      t.ok(result.body[0].label, 'Record label returned')
    })
  //  testAsync('Registration Teardown', async (t) => {
  //     await db('customers').del().where({email: newMember.email.toLowerCase()})
  //     .then(() => {
  //       t.pass('Registration Closed')
  //     })
  //   })
}
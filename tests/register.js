const testAsync = require('tape-async')
const request = require('supertest')
// const config = require('config')
const { db } = require('../src/database/connection.js')
const { v4: uuidv4 } = require('uuid')
const newMember = {
    id: uuidv4(),
    first_name: 'Test',
    last_name: 'Example',
    email: 'Test@example.com',
    password: 'Tezdyzfdgf@#$%^r1234dfs'
}
module.exports = (app) => {
    testAsync('Bad Password Registration', async (t) => {
      const result = await request(app)
        .post('/api/v1/users')
        .send({...newMember, password: '12345'})
        .expect(403)
      t.ok(result.body.error, 'Error Thrown')
      t.ok(result.body.msg, 'Message provided')
      t.equal(result.body.error, 403, 'Bad Request')
    })
    testAsync('Bad Email Registration', async (t) => {
      const result = await request(app)
        .post('/api/v1/users')
        .send({...newMember, email: 'foo@'})
        .expect(403)
      t.ok(result.body.error, 'Error Thrown')
      t.ok(result.body.msg, 'Message provided')
      t.equal(result.body.error, 403, 'Bad Request')
    })
    testAsync('Register new member', async (t) => {
      const result = await request(app)
          .post('/api/v1/users')
          .send(newMember)
          .expect(200)
        t.error(result.body.error, 'No Errors')
        t.equal(result.body.email, newMember.email.toLowerCase(), 'Correct user returned')
        t.ok(result.body.id, 'User Id provided')
        t.ok(result.body.default_profile, 'Role provided')
        t.equal(result.body.token.length, 7 + 36, 'Token Length Correct')
    })
    
    testAsync('Duplicate Registration', async (t) => {
        const result = await request(app)
          .post('/api/v1/users')
          .send(newMember)
          .expect(403)
        t.ok(result.body.error, 'Error Thrown')
        t.ok(result.body.msg, 'Message provided')
        t.equal(result.body.error, 403, 'Bad Request')
    })

    testAsync('Failed Registration', async (t) => {
        const result = await request(app)
          .post('/api/v1/users')
          .send({})
          .expect(403)
        t.ok(result.body.error, 'Error Thrown')
        t.ok(result.body.msg, 'Message provided')
        t.equal(result.body.error, 403, 'Bad Request')   
    })
    testAsync('Registration Teardown', async (t) => {
      await db('users').del().where({email: newMember.email.toLowerCase()})
      .then(() => {
        t.pass('Registration Closed')
      })
    })
}
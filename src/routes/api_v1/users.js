const axios = require('axios');
const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const authenticate = require('../../utilities/authenticate.js')
const { self_or_admin, token } = require('../../utilities/authenticate.js')
const parser = require('../../utilities/parser.js')
const passport = require('passport')
const JsonStrategy = require('passport-json').Strategy
// const { adminOnly } = require('../../utilities/authenticate.js')
const { passwordResetEmail } = require('../../utilities/email.js')
const { db, TX } = require('../../database/connection.js')
const config = require('config')
const sql = require('../sql/users.js')
const expirationTime = 30 * 24 * 60 * 60 * 1000

const cloudinary = require('cloudinary')
const cloudinaryStorage = require('multer-storage-cloudinary')
const multer = require('multer')
const slackUtility = require('../../utilities/slackUtility.js');
const { response } = require('express');

const storage = (width, height) => cloudinaryStorage(
  { cloudinary
  , folder: 'profile_image'
  , allowedFormats: ['jpg', 'png']
  , filename: (req, file, cb) => {
      cb(null, req.params.email)
    }
  , transformation:
    { width, height, crop: 'fill' }
})

const profile_image = multer({ storage: storage(config.get('profileImageWidth'), config.get('profileImageHeight')) }).single('profile_image')

const authResponse = async (id) => {
  const token = uuidv4()
  try {
    const expires = new Date(Date.now() + expirationTime)
    
    const result = await db.raw(sql.getUserById, {userId: id })
    const profile = result.rows[0] || {}
    
    await db('auth_tokens').insert({ token, expires, user_id: id })
    
    return { ...profile, token: 'Bearer ' + token }
  } catch (error) {
    console.log(error)
    return { id, token: 'Bearer ' + token }
  }
}

passport.use('json', new JsonStrategy({ usernameProp: 'email' }, async function (email, password, done) {
  if (!email) return done(null, false, 'Email missing.')
  if (!password) return done(null, false, 'Password missing.')

  try {
    const user = await authenticate.password(email, password)
    return done(null, user)
  } catch (e) {
    return done(e)
  }
}))

// LOGIN
router.post('/local', (req, res, next) => {
  passport.authenticate('json', async function (err, user, _info) {
    if (err) return res.status(401).json({ error: 401, code: 'PASSPORT_ERROR', msg: err.message })
    if (!user) return res.status(401).json({ error: 401, code: 'UNKNOWN_USER', msg: 'User not recognized.' })

    await db('users').update({ last_login_at: new Date(Date.now()) }).where({id: user.id})

    res.json(await authResponse(user.id))
  })(req, res, next)
})

// REGISTER
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body
    if (!email) { return res.status(403).json({ error: 403, code: 'MISSING_EMAIL', msg: 'Email required.' }) } 
    if (!parser.isValidEmail(email)) { return res.status(403).json({ error: 403, code: 'INVALID_EMAIL', msg: 'Invalid email' }) }

    const existingEmail = await db('users').first().where({ email })
    if (existingEmail && existingEmail.email) {
      return res.status(403).json({ error: 403, code: 'USER_EXISTS', msg: 'User already exists. Please login.' })
    }
    if (!parser.isValidPassword(password)) {
      return res.status(403).json({ error: 403, code: 'INVALID_PASSWORD', msg: 'Invalid password' })
    }

    const id = uuidv4()
    const user = { 
      id,
      email,
      first_name, 
      last_name,
      phone
    }
    const password_hash = await authenticate.hash(password)
    
    const tx = await TX()
    await tx('users').transacting(tx).insert(user)
    await tx('user_local_auths').transacting(tx).insert({ user_id: user.id, password_hash })
    await tx.commit()
    // welcomeEmail(email)
    res.json(await authResponse(user.id))
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: 400, code: 'REGISTRATION_ERROR', msg: 'Unable to save new user' })
  }
})

router.post('/google', async (req, res) => {
  try { 
    const { email, familyName: last_name, givenName: first_name, imageUrl: profile_image, googleId: google_id, id_token, access_token } = req.body
    if (!email) { return res.status(403).json({ error: 403, code: 'GOOGLE_ERROR', msg: 'Invalid request' }) }

    const existingUser = await db('users').first().where({ email })

    if (!existingUser || !existingUser.id) {
      const user_id = uuidv4()
      const user = { email, first_name, last_name, profile_image, id: user_id }
      const tx = await TX()
      await tx('users').transacting(tx).insert(user)
      await tx('user_google_auths').transacting(tx).insert({ user_id, google_id, id_token, access_token })
      await tx.commit()
      return res.json(await authResponse(user_id))
    }
    if (existingUser.archived_at) {
      throw new Error('Account deactivated')
    }
    const user_id = existingUser.id
    const googleUser = await db('user_google_auths').first().where({ user_id }).andWhere({ google_id })

    if (googleUser && googleUser.user_id) {
      await db('user_google_auths').update({ id_token, access_token }).where({ user_id})
      await db('users').update({ last_login_at: new Date(Date.now()) }).where({id: user_id})
    
      return res.json(await authResponse(user_id))
    } else {
      return res.status(403).json({ error: 403, code: 'USER_EXISTS', msg: 'User already exists. Please sign in with your username and password.' })
    }
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: 400, code: 'REGISTRATION_ERROR', msg: 'Unable to authenticate google user' })
  }

})

router.post('/local/reset/:email', async (req, res) => {
  const email = req.params.email
  const user = await db('users').first().where({ email })
  if (!user || !user.id) {
    return res.status(401).json({ error: 401, code: 'INVALID_USER', msg: 'Invalid user' })
  }
  const reset_token = uuidv4()
  const rows = await db('user_local_auths').update({ reset_token }).where({ user_id: user.id })

  if (rows !== 1) return res.status(401).send({ error: 401, code: 'NOT_FOUND', msg: 'User not found.' })

  passwordResetEmail(reset_token, email)

  res.status(200).send({ reset_token })
})

router.put('/local/reset/:email', async (req, res) => {
  const { reset_token, new_password } = req.body

  if (!new_password) return res.status(403).json({ error: 403, code: 'MISSING_PASSWORD', msg: 'Missing password for reset' })
  if (!reset_token) return res.status(403).json({ error: 403, code: 'MISSING_TOKEN', msg: 'Missing token for reset' })
  if (!parser.isValidPassword(new_password)) {
    return res.status(403).json({ error: 403, code: 'INVALID_PASSWORD', msg: 'Invalid password' })
  }
  const password_hash = await authenticate.hash(new_password)
  try {
    const user = await db('users').first().where({ email: req.params.email })
    if (!user || !user.id) {
      return res.status(403).json({ error: 403, code: 'INVALID_USER', msg: 'Invalid user or token.' })
    }
    const rows = await db('user_local_auths').update({ password_hash, reset_token: '' })
      .where({ user_id: user.id, reset_token })

    if (rows !== 1) return res.status(403).json({ error: 403, code: 'INVALID_USER', msg: 'Invalid user or token' })
    
    res.status(200).json(await authResponse(user.id))
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: 'Cannot change password' })
  }
})

router.use(token)

router.get('/', async (req, res) => {
  try {
    res.json(await authResponse(req.user.id))
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update user" })
  }
})

router.post('/data_request', async (req, res) => {
  try {
    const user = await db('users').first().where({ id: req.user.id })
    if (!user || !user.id) {
      return res.status(401).json({ error: 401, code: 'UPDATE_ERROR', msg: "Update not allowed"})
    } 
    const { type: data_type, value: data_value } =  req.body

    const data = { user_id: req.user.id, data_type, data_value }
    const existingItem = await db('user_requests').first().where(data)
    if (!existingItem) {
      await db('user_requests').insert(data)
      slackUtility.userRequest(req.user, data_type, data_value)
    }
    res.status(202).send()
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot make data request" })
  }
})

router.post('/:user_id/verify', self_or_admin, async (req, res) => {
  try {
    const user = await db('users').first().where({ id: req.params.user_id })
    if (!user || !user.id) {
      return res.status(401).json({ error: 401, code: 'VERIFICATION_ERROR', msg: "Verification user not found"})
    } 
    if (!user.first_name || !user.last_name || !user.address || !user.dob || 
        !user.city || !user.state || !user.postcode || !user.consent_at) {
      return res.status(403).json({ error: 403, code: 'VERIFICATION_ERROR', msg: "User must provide accurate information and give consent"})
    } 
    const existing = await db('user_verifications').select().where({user_id: user.id})
    if (existing && existing.length >= 5) {
      return res.status(403).json({ error: 403, code: 'VERIFICATION_ERROR', msg: "Exceeded maximum attempts.  Contact Home Handy for assistance"})
    }
    const authData = JSON.stringify({
      "UserName": config.get('datazooUser'),
      "Password": config.get('datazooPass')
    });
    const authConfig = {
      method: 'post',
      url: 'https://resttest.datazoo.com/api/Authenticate.json',
      headers: { 
        'Content-Type': 'application/json'
      },
      data : authData
    };
    const authResponse = await axios(authConfig)
    const sessionToken = authResponse.data.sessionToken
    const streetNumberRegex = /^\d+\w*\s*(?:[\-\/]?\s*)?\d*\s*\d+\/?\s*\d*\s*/;
    const streetNum = user.address.match(streetNumberRegex)[0]
    const streetNo = (streetNum || '').trim()
    const addressPieces = user.address.split(' ')
    const streetType = addressPieces[addressPieces.length - 1]
    var creditData = {
      dataSources: ['Australian Credit Bureau'],
      reportingReference: null,
      firstName: user.first_name,
      lastName: user.last_name,
      dateOfBirth: parser.formatDate(user.dob, 'yyyy-MM-dd'),
      streetNo: streetNo,
      streetName: user.address.replace(new RegExp('^' + streetNo),'').replace(new RegExp(streetType + '$'), '').trim(),
      streetType: streetType.trim(),
      suburb: user.city || '',
      state: user.state || '',
      postCode: user.postcode || '',
      creditBureauConsentObtained: true
    }
    var creditConfig = {
      method: 'post',
      url: 'https://resttest.datazoo.com/api/Australia/Verify.json',
      headers: { 
        'Content-Type': 'application/json', 
        'UserName': config.get('datazooUser'), 
        'SessionToken': sessionToken
      },
      data : JSON.stringify(creditData)
    };
    
    const verificationResponse = await axios(creditConfig) 
    const userVerification = {
      user_id: user.id,
      reporting_reference: verificationResponse.data.reportingReference,
      safe_harbour: verificationResponse.data.safeHarbour,
      status: verificationResponse.data.creditBureau.status,
      verified: verificationResponse.data.creditBureau.verified,
      safe_harbour_score: verificationResponse.data.creditBureau.safeHarbourScore,
      verification_response: JSON.stringify(verificationResponse.data)
    }  
    if (userVerification.verified) {
      await db('user_verifications').del().where({user_id: user.id})
    } 
    await db('user_verifications').insert(userVerification)
    res.json(verificationResponse.data)
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot make data request" })
  }
})

router.patch('/toggle_profile', async (req, res) => {
  try {
    const user = await db('users').first().where({ id: req.user.id })
    if (!user || !user.id) {
      return res.status(401).json({ error: 401, code: 'UPDATE_ERROR', msg: "Update not allowed"})
    }
    const newValue = user.default_profile === 'customer' ? 'agent' : 'customer'
    await db('users').update({default_profile: newValue}).where({ id: req.user.id })

    res.json(await authResponse(req.user.id))
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update user" })
  }
})

router.patch('/:user_id', async (req, res) => {
  const tx = await TX()
  try {
    const userId = req.params.user_id
    const data = {}
    const dateNow = parser.getUTCDate()
    if (req.body.archive) {
      data.archived_at = dateNow
      await db('auth_tokens').where({user_id: userId}).del()
    } else if (req.body.pause) {
      data.is_paused = true
      data.paused_at = dateNow
      data.deactivate_at = new Date(req.body.deactivate_at)
    } else if (req.body.activate) {
      data.is_paused = false
      data.paused_at = null
      data.deactivate_at = null
      data.archived_at = null
    }

    await tx('users').transacting(tx).update(data).where({ id: userId })
    await tx.commit()
    res.status(202).send()
  } catch (e) {
    tx.rollback()
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update service package" })
  }
})

router.put('/', async (req, res) => {
  try {
    const
    { id: _
    , profile_image: _profile_image
    , default_profile: _default_profile
    , google_id: _google_id
    , token: _token
    , verifications: _verifications
    , last_login_at: _last_login_at
    , created_at: _created_at
    , ...user
    } = req.body

    await db('users').update(user).where({ id: req.user.id })
    res.json(await authResponse(req.user.id))
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update user" })
  }
})

router.put('/profile_image', profile_image, async (req, res) => {
  try {
    await db('users').update({ profile_image: req.file.secure_url }).where({ id: req.user.id })
    res.json(await authResponse(req.user.id))
  } catch (e) {
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update user image" })
  }
})

module.exports = router

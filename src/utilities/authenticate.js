const { SecurePass } = require('argon2-pass')
const { db } = require('../database/connection.js')

module.exports.token = async (req, res, next) => {
  const bearer = req.get('Authorization')
  if (!bearer || bearer.length !== 7 + 36) { return res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Invalid token provided.' }) }
  const token = bearer.slice(7)
  const now = new Date()

  try {
    const user = await db('users')
      .first('users.*', 'auth_tokens.*')
      .innerJoin('auth_tokens', 'users.id', '=', 'auth_tokens.user_id')
      .where('auth_tokens.token', '=', token)
      .andWhere('auth_tokens.expires', '>', now)
    if (!user || !user.email) { throw new Error('User could not authenticate') }
    req.user = user
    next()
  } catch (e) {
    if (process.env.NODE_ENV === 'localhost') { console.warn('error', e) }
    res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Invalid token.' })
  }
}

module.exports.password = async (email, password) => {
  const sp = new SecurePass()

  // Passwords and Hashes are stored as buffers internally.
  const passwordBuf = Buffer.from(password)

  const user = await db('user_local_auths').first('password_hash')
    .innerJoin('users', 'users.id', '=', 'user_local_auths.user_id')
    .whereNull('users.archived_at').andWhere({ 'users.email': email })

  if (!user || !user.password_hash) throw new Error('Not registered.')

  // Hash Verification returns an enumerator for easy validation of passwords against hashes.
  const result = await sp.verifyHash(
    passwordBuf,
    Buffer.from(user.password_hash, 'base64')
  )

  if (SecurePass.isInvalidOrUnrecognized(result)) {
    throw new Error('Invalid Password')
  } else if (SecurePass.isInvalid(result)) {
    throw new Error('Incorrect Password')
  } else if (SecurePass.isValid(result)) {
    const outUser = await db
      .where({ email })
      .first()
      .from('users')

    return outUser
  } else if (SecurePass.isValidNeedsRehash(result)) {
    const newHash = await sp.hashPassword(passwordBuf)
    await db.where({ email }).update('password_hash', newHash.toString('base64'))

    return outUser
  }

  throw new Error('Unexpected login result. Try again later.')
}

module.exports.hash = async (password) => {
  const sp = new SecurePass()
  const passwordBuf = Buffer.from(password)
  const passwordHash = (await sp.hashPassword(passwordBuf)).toString('base64')
  return passwordHash
}

module.exports.self_or_admin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 401, code: 'UNAUTHORIZED', msg: 'Not Authorized' })
  if (req.user.default_profile === 'admin') return next()
  const user_id = req.params.user_id || req.body.user_id
  if (req.user.id === user_id) return next()
  res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Not Authorized' })
}

module.exports.company_access = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 401, code: 'UNAUTHORIZED', msg: 'Not Authorized' })
    const company = await db('user_companies').first().where({ company_id: req.params.company_id, user_id: req.user.id })
    if (company && company.id) {
      return next()
    }
    return res.status(403).json({ error: 403, code: 'UNAUTHORIZED', msg: "Company access denied"})
  } catch (error) {
    return res.status(400).json({ error: 400, code: 'ACCESS_ERROR', msg: "Access failed"})
  }
}

module.exports.property_access = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 401, code: 'UNAUTHORIZED', msg: 'Not Authorized' })
    const property = await db('user_properties').first().where({ property_id: req.params.property_id, user_id: req.user.id })
    if (property && property.id) {
      return next()
    }
    return res.status(403).json({ error: 403, code: 'UNAUTHORIZED', msg: "Property access denied"})
  } catch (error) {
    return res.status(400).json({ error: 400, code: 'ACCESS_ERROR', msg: "Access failed"})
  }
}

// module.exports.members_only = (req, res, next) => {
//   if (!req.user) return res.status(401).json('Not Authorized')
//   if (req.user.default_profile === 'admin' || req.user.default_profile === 'member') return next()
//   res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Not Authorized' })
// }

// module.exports.admin_only = (req, res, next) => {
//   if (!req.user || req.user.default_profile !== 'admin') {
//     return res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Not Authorized' })
//   }
//   next()
// }

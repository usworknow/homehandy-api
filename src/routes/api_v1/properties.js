const router = require('express').Router()
const { db, TX } = require('../../database/connection.js')
const sql = require('../sql/properties.js')
const { v4: uuidv4 } = require('uuid')
const { property_access } = require('../../utilities/authenticate')

router.get('/', async (req, res) => {
    try {
      let result
      if (req.user && req.user.default_profile === 'admin'){
        if (req.query.search) {
          result = await db.raw(sql.getSearch, {term: req.query.search })
        } else {
          result = await db.raw(sql.getAll)
        }
      } else {
        result = await db.raw(sql.getPropertiesForUser, { userId: req.user.id })
      }
      return res.status(200).json(result.rows)
    } catch (e) {
      console.error(e)
      return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot get properties" })
    }
})

router.get('/:property_id', async (req, res) => {
  const propertyId = req.params.property_id
  try {
    let result
    if (req.user.default_profile === 'admin') {
      result = await db.raw(sql.getPropertyById, { propertyId })
    } else {
      result = await db.raw(sql.getPropertyForUser, { propertyId: propertyId, userId: req.user.id })
    }
    if (!result || !result.rows )
      return res.status(404).json({ error: 404, code: 'NOT_FOUND', msg: "Can't find requested property."})
    const property = result.rows[0] || {}
    return res.status(200).json(property)
  } catch (e) {
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot get property" })
  }
})

router.post('/', async (req, res) => {
  try {
    const property = req.body
    const propertyId = uuidv4()
    await db('properties').insert({ id: propertyId, ...property })
    await db('user_properties').insert({ user_id: req.user.id, property_id: propertyId })
    res.status(202).send()
  } catch (error) {
    console.error(error)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot create property" })
  }
})

router.put('/:property_id', property_access, async (req, res) => {
  try {
    const propertyId = req.params.property_id
    const
    { id: _
    , created_at: __
    , services: _services
    , users: _users
    , ...property
    } = req.body

    await db('properties').update(property).where({ id: propertyId })

    res.status(202).send()
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update property" })
  }
})

router.post('/:property_id/services', property_access, async (req, res) => {
  const tx = await TX()
  try {
    const propertyId = req.params.property_id
    const services = req.body
    await tx('property_services').transacting(tx).del().where({property_id: propertyId})
    const newServices = services.map(id => ({property_id: propertyId, service_id: id}))
    await tx('property_services').transacting(tx).insert(newServices)
    await tx.commit()
    res.status(202).send()
  } catch (error) {
    tx.rollback()
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Services not updated"})
  }
})

module.exports = router

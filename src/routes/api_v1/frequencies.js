const router = require('express').Router()
const { db } = require('../../database/connection.js')

router.get('/', async (req, res) => {
    const refs = await db('frequencies').select()
    res.json(refs)
})

module.exports = router

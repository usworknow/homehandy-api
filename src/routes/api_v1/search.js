const router = require('express').Router()
// const { db } = require('../../database/connection.js')

router.post('/', async (req, res) => {
    try {
        res.json([])
    } catch (error) {
        console.error('POST SEARCH', error)
        return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Failed to complete search" })
    }
});


module.exports = router

const router = require('express').Router()
const { db } = require('../../database/connection.js')

router.post('/webhook/event', async (req, res) => {
    try {
        const data = req.body
        console.log('STRIPE DATA', data.id, data.type)
    } catch (error) {  
        console.error('STRIPE EVENT', error)
    }
    res.sendStatus(200)
})

module.exports = router

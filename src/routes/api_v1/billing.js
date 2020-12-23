const router = require('express').Router()
// const { db } = require('../../database/connection.js')
const stripeUtility = require('../../utilities/stripeUtility')

router.post('/intent', async (req, res) => {
    try {
        const intent = await stripeUtility.paymentIntents.create(req.user, 5455)
        res.json(intent)
    } catch (error) {
        console.error('POST intent', error)
        return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Failed to create intent" })
    }
});

router.get('/intent/:intentId', async (req, res) => {
    try {
        const intent = await stripeUtility.paymentIntents.retrieve(req.params.intentId)
        res.json(intent);
    } catch (error) {
        console.error('POST intent', error)
        return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Failed to create intent", data: error })
    }
});

module.exports = router

const router = require('express').Router()

router.use('/users', require('./users'))
router.use('/stripe', require('./stripeEvents'))
const authenticate = require('../../utilities/authenticate.js')

router.use(authenticate.token)
router.use('/companies', require('./companies'))
router.use('/frequencies', require('./frequencies'))
router.use('/notifications', require('./notifications'))
router.use('/properties', require('./properties'))
router.use('/services', require('./services'))
router.use('/inclusions', require('./inclusions'))
router.use('/billing', require('./billing'))
router.use('/search', require('./search'))


module.exports = router

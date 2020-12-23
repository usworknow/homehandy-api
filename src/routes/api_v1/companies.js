const router = require('express').Router()
const { db, TX } = require('../../database/connection.js')
const sql = require('../sql/companies.js')
const { v4: uuidv4 } = require('uuid')
const config = require('config')
const { company_access } = require('../../utilities/authenticate')
const parser = require('../../utilities/parser')
const cloudinary = require('cloudinary')
const cloudinaryStorage = require('multer-storage-cloudinary')
const multer = require('multer')
const StripeUtility = require('../../utilities/stripeUtility')

const storage = (width, height) => cloudinaryStorage(
  { cloudinary
  , folder: 'company_logo'
  , allowedFormats: ['jpg', 'png']
  , filename: (req, file, cb) => {
      cb(null, req.params.email)
    }
  , transformation:
    { width, height, crop: 'fill' }
})

const logo = multer({ storage: storage(config.get('profileImageWidth'), config.get('profileImageHeight')) }).single('logo')


const docStorage = cloudinaryStorage(
  { cloudinary
  , filename: (req, file, cb) => {
    cb(null, null)
  }
  , folder: 'agent_document'
  , access_mode: 'authenticated'
})

const documents = multer({ docStorage }).array('documents')

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
      result = await db.raw(sql.getCompaniesForUser, { userId: req.user.id })
    }
    return res.status(200).json(result.rows)
  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Failed to get companies" })
  }
})

router.get('/:company_id', async (req, res) => {
  const companyId = req.params.company_id
  try {
    let result
    if (req.user.default_profile === 'admin') {
      result = await db.raw(sql.getCompanyById, { companyId })
    } else {
      result = await db.raw(sql.getCompanyForUser, { companyId: companyId, userId: req.user.id })
    }
    if (!result || !result.rows )
      return res.status(404).json({ error: 404, code: 'NOT_FOUND', msg: "Can't find requested company."})
    const company = result.rows[0] || {}
    let account = null
    if (company && company.stripe_id) {
      account = await StripeUtility.accounts.retrieve(company.stripe_id)
    }
    company.account = account
    return res.status(200).json(company)
  } catch (e) {
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot get company" })
  }
})

router.post('/', async (req, res) => {
  const company = req.body
  const companyId = uuidv4()
  let account = null
  try {
      account = await StripeUtility.accounts.create(req.user, company)
  } catch (error) {
      console.error(error)
      return res.status(400).json({ 
        error: 400, 
        code: 'STRIPE_ERROR', 
        msg: error && error.raw && error.raw.message ? error.raw.message : StripeUtility.errors.getMessage(error) 
      })
  }
  try {
    if (company.dba === 'individual') {
      if (company.dob) delete company.dob
    }
    if (company.tos_ip) delete company.tos_ip
    if (company.tax_id) delete company.tax_id
    await db('companies').insert({ id: companyId, ...company, stripe_id: account ? account.id : null })
    await db('user_companies').insert({ user_id: req.user.id, company_id: companyId })
    if (!req.user.city && !req.user.state) {
      const userInfo = {
        address: company.address,
        address2: company.address2,
        city: company.city,
        state: company.state,
        country: company.country,
        postcode: company.postcode
      }
      if (!req.user.phone) {
        userInfo.phone = company.phone
      }
      await db('users').update(userInfo).where({ id: req.user.id })
    }
    res.status(202).send()
  } catch (error) {
    console.error(error)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot create company", data: error })
  }
})

router.put('/:company_id', company_access, async (req, res) => {
  try {
    const companyId = req.params.company_id
    const
    { id: _
      , stripe_id: _stripeId
      , logo: _logo
      , tax_id: _tax_id
      , first_name: _first
      , last_name: _last
      , documents: _documents
      , dob: _dob
      , created_at: __
      , users: _users
      , hours: _hours
      , services: _services
      , account: _account
      , service_areas: _service_areas
      , service_packages: _service_packages
      , ...company
    } = req.body
    await db('companies').update(company).where({ id: companyId })
    const stripeCompany = {...company, stripe_id: _stripeId}
    if (_tax_id)  {
      stripeCompany.tax_id = _tax_id
    }
    await StripeUtility.accounts.update(stripeCompany)
    res.status(202).send()

  } catch (e) {
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update company" })
  }
})

router.put('/:company_id/logo', company_access, logo, async (req, res) => {
  try {
    const companyId = req.params.company_id
    await db('companies').update({ logo: req.file.secure_url }).where({ id: companyId })
    res.status(202).send()
  } catch (e) {
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update Company logo" })
  }
})

router.put('/:company_id/documents', company_access, documents, async (req, res) => {
  try {
    const companyId = req.params.company_id
    
    console.warn('for DBA individual, send photo id front/back to Stripe', companyId)
    console.log('FILES', req.files)
    // await db('companies').update({ documents: req.files.map(x => x.secure_url) }).where({ id: companyId })
    res.status(202).send()
  } catch (e) {
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update Company documents" })
  }
})

router.post('/:company_id/payment_methods', company_access, async (req, res) => {
  try {
    const companyId = req.params.company_id
    const { id } = req.body
    const company = await db('companies').first().where({ id: companyId }) 
    if (!company || !company.id ) {
      return res.status(404).json({ error: 404, code: 'NOT_FOUND', msg: "Can't find requested company."})
    }
    const account = await StripeUtility.accounts.updateExternalAccount(company, id)
    // console.log('CONNECTED ACCOUNT', account)
    res.status(202).send()
  } catch (error) {
    console.error(error)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Payment Methods not updated", data: error})
  }
})


router.post('/:company_id/hours', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const hours = req.body
    await tx('company_hours').transacting(tx).del().where({company_id: companyId})
    const newHours = hours.map(hourSet => ({...hourSet, company_id: companyId}))
    await tx('company_hours').transacting(tx).insert(newHours)
    await tx.commit()
    res.status(202).send()
  } catch (error) {
    tx.rollback()
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Hours not updated"})
  }
})

router.post('/:company_id/services', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const services = req.body
    await tx('company_services').transacting(tx).del().where({company_id: companyId})
    const newServices = services.map(id => ({company_id: companyId, service_id: id}))
    await tx('company_services').transacting(tx).insert(newServices)
    await tx.commit()
    res.status(202).send()
  } catch (error) {
    tx.rollback()
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Services not updated"})
  }
})

router.post('/:company_id/service_areas', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const areas = req.body
    await tx('company_service_areas').transacting(tx).del().where({company_id: companyId})
    const newAreas = areas.map(area => ({company_id: companyId, ...area}))
    await tx('company_service_areas').transacting(tx).insert(newAreas)
    await tx.commit()
    res.status(202).send()
  } catch (error) {
    tx.rollback()
    console.error('Error', error)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Service Areas not updated"})
  }
})

router.post('/:company_id/service_packages', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const packageId = uuidv4()

    const {
      id: _,
      company_id: __,
      mains: _mains,
      addons: _addons,
      scopes: _scopes,
      upgrades: _upgrades,
      inclusions: _inclusions,
      ...servicePackage
    } = req.body

    await tx('service_packages').transacting(tx).insert({
      id: packageId, 
      company_id: companyId, 
      ...servicePackage
    })
    const newInclusions = (req.body.inclusions || []).map(item => ({
      service_package_id: packageId, 
      ...item
    }))
    await tx('service_package_inclusions').transacting(tx).insert(newInclusions)
    await tx.commit()
    res.status(202).send()
  } catch (error) {
    tx.rollback()
    console.error(error)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Service Package not updated"})
  }
})

router.put('/:company_id/service_packages/:package_id', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const packageId = req.params.package_id
    const {   
        id: _id
      , company_id: _company_id
      , service_label: _serviceLabel
      , mains: _mains
      , addons: _addons
      , scopes: _scopes
      , upgrades: _upgrades
      , inclusions: _inclusions
      , created_at: _createdAt
      , ...servicePackage
    } = req.body
    await tx('service_packages').transacting(tx).update(servicePackage).where({ id: packageId, company_id: companyId })
    await tx('service_package_inclusions').transacting(tx).del().where({service_package_id: packageId})
    const newInclusions = _inclusions.map(item => ({
      service_package_id: packageId, 
      service_inclusion_id: item.service_inclusion_id, 
      frequency_id: item.frequency_id, 
      value: item.value,
      price: item.price
    }))
    await tx('service_package_inclusions').transacting(tx).insert(newInclusions)
    await tx.commit()
    res.status(202).send()
  } catch (e) {
    tx.rollback()
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update service package" })
  }
})

router.patch('/:company_id/service_packages/:package_id', company_access, async (req, res) => {
  const tx = await TX()
  try {
    const companyId = req.params.company_id
    const packageId = req.params.package_id
    const data = {}
    const dateNow = parser.getUTCDate()
    if (req.body.archive) {
      data.archived_at = dateNow
    } else if (req.body.pause) {
      data.is_paused = true
      data.paused_at = dateNow
      data.reactivate_at = new Date(req.body.reactivate_at)
    } else if (req.body.activate) {
      data.is_paused = false
      data.paused_at = null
      data.reactivate_at = null
      data.archived_at = null
    }

    await tx('service_packages').transacting(tx).update(data).where({ id: packageId, company_id: companyId })
    await tx.commit()
    res.status(202).send()
  } catch (e) {
    tx.rollback()
    console.error(e)
    return res.status(400).json({ error: 400, code: 'BAD_REQUEST', msg: "Cannot update service package" })
  }
})

module.exports = router

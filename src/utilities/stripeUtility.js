const config = require('config')
const stripe = require('stripe')(config.get('stripeKey'), { apiVersion: '2020-03-02' })

module.exports.paymentIntents = {
  create: async (user, amount) => {
    const intent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'aud',
      payment_method_types: ['card'],
      setup_future_usage: 'off_session',
      statement_descriptor: 'Package Name',
      receipt_email: user.email,
      // metadata: {
      //   order_id: user.id
      // }
    })
    console.log('INTENT', intent)
    return intent  
  },
  retrieve: async (intentId) => {
    const intent = await stripe.paymentIntents.retrieve(intentId)
    console.log('INTENT', intent)
    return intent  
  }
}
module.exports.accounts = {
  retrieve: async (stripeId) => {
    try {
      return await stripe.accounts.retrieve(stripeId)
    } catch (error) {
      console.error('STRIPE ERROR', error && error.raw ? error.raw.message : error)
      return {}
    }
  },
  create: async (user, company) => {
    // console.log('COMPANY IN', company)
    const stripeModel = setStripeModel({...company, email: user.email, first_name: user.first_name, last_name: user.last_name})
    stripeModel.email = user.email
    stripeModel.type = 'custom'
    if (company.tax_id) {
      if (company.dba === 'individual') { 
        stripeModel.individual.id_number = company.tax_id
      } else { stripeModel.company.tax_id = company.tax_id }
    }
    if (company.tos_ip) {
      stripeModel.tos_acceptance = {
        date: Math.floor(Date.now() / 1000),
        ip: company.tos_ip
      }
    }
    // console.log('STRIPE OUT', stripeModel)
    const account = await stripe.accounts.create(stripeModel)
    return account
  },
  update: async (company) => {
    const model = setStripeModel(company)
    if (company.tax_id) {
      if (company.dba === 'individual') { 
        stripeModel.individual.id_number = company.tax_id
      } else { stripeModel.company.tax_id = company.tax_id }
    }
    return await stripe.accounts.update(company.stripe_id, model)
  },
  updateExternalAccount: async (company, token) => {
    const model = setStripeModel(company)
    model.external_account = token
    return await stripe.accounts.update(company.stripe_id, model)
  },

  createExternalAccount: async (stripeId, paymentMethodId) => {
    return await stripe.accounts.createExternalAccount(stripeId, {
      external_account: paymentMethodId
    })
  }
}

const setStripeModel = (company) => {
  const data = {
    requested_capabilities: [ 'transfers' ],
    business_type: company.dba || 'company',
    business_profile: {
      product_description: company.description,
      name: company.name,
      url: company.website
    },
    settings: {
      payments: {
        statement_descriptor: company.name.length >= 5 ? company.name.substring(0, 21) : (company.name + '____')
      },
      payouts: {
        statement_descriptor: company.name.length >= 5 ? company.name.substring(0, 21) : (company.name + '____'),
        schedule: {
          interval: 'manual'
        }
      }
    }
  }
  if (company.dba === 'company') {
    data.company = {
      address: {
        line1: company.address,
        line2: company.address2,
        city: company.city,
        state: company.state,
        country: company.country || 'AU',
        postal_code: company.postcode
      },
      name: company.name
    }
  } else {
    data.individual = {
      address: {
        line1: company.address,
        line2: company.address2,
        city: company.city,
        state: company.state,
        country: company.country || 'AU',
        postal_code: company.postcode
      }
    }
    if (company.email) data.individual.email = company.email
    if (company.first_name) data.individual.first_name = company.first_name
    if (company.last_name) data.individual.last_name = company.last_name
    if (company.dob) {
      const date = new Date(company.dob);
      data.individual.dob = {
        day: date.getUTCDate(),
        month: Number(date.getUTCMonth() + 1),
        year: date.getUTCFullYear()
      }
    }
  }
  // console.log('DATA OUT', data)
  return data
}
module.exports.errors = {
  getMessage: (err) => {
    switch (err.type) {
      case 'StripeCardError':
        // A declined card error
        return err.message; // => e.g. "Your card's expiration year is invalid."
      case 'StripeRateLimitError':
        return "Too many requests made to the API too quickly"
      case 'StripeInvalidRequestError':
        return "Invalid parameters were supplied to Stripe's API"
      case 'StripeAPIError':
        return "An error occurred internally with Stripe's API"
      case 'StripeConnectionError':
        return "We had a connection issue.  Please try again"
      case 'StripeAuthenticationError':
        return "Incorrect Stripe key provided."
      default:
        return "We had an unexpected problem with payment processing"
    }
  }
}

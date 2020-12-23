// const { URL } = require('url')
const config = require('config')
// // // const { db } = require('../database/connection.js')
const frontendDomain = config.get('frontendDomain')
// const mailgunDomain = 'mailgun.EXAMPLE.com'

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(config.get('sendgridAPI'))

const sendEmail = (templateId) => (to, templateData) => {
  if (to.endsWith('example.com')) {
    console.log('To: %s\nVariables: %O', to, templateData)
    return
  }

  const meta = {
    to: to,
    from: 'no-reply@homehandy.com',
    templateId: templateId,
    dynamic_template_data: templateData
  }
//   const data = {...meta, ...mergeVars}
  sgMail.send(meta, function (error, body) {
    if (error) {
      console.dir(error)
      return
    }
    console.dir(body)
  })
}

module.exports.passwordResetEmail = (token, recipientEmail) => {
    const resetUrl = new URL(`/set-password/${encodeURIComponent(recipientEmail)}?token=${token}`, 'http://' + frontendDomain)
    const templateData = {
      subject: resetUrl.toString()
    }

    sendEmail('d-4d1177c6f7b04d3797da75f87ee5b8bd')(recipientEmail, templateData)
}

module.exports.welcomeEmail = (token, recipientEmail) => {
    const resetUrl = new URL(`/set-password/${encodeURIComponent(recipientEmail)}?token=${token}`, 'http://' + frontendDomain)
    const templateData = {
        subject: 'Welcome',
        resetUrl: resetUrl.toString()
      }
  
    sendEmail('d-42c3b65fbe5c41159dcdd38514580f3f')(recipientEmail, templateData)
}

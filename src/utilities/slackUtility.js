var request = require('superagent')

const sendSlack = (url, msg, callback) => {
    // if (process.env.NODE_ENV && process.env.NODE_ENV !== 'prod') {
    //   console.log('\n\nSending Slack... ', msg, '\n\n')
    //   return
    // }
    try {
      request
        .post(url)
        .set('Content-Type', 'application/json')
        .send({ text: msg })
        .end(function (err, response) {
          if (err) { console.log('REQUEST ERROR: ' + err) }
          if (callback) { callback(err, response) }
        })
    } catch (e) {
      console.log('SLACK FAILED', e ? e.message : 'No exception')
      console.error('SLACK FAILED', e)
    }
}

module.exports.userRequest = (user, type, value) => {
  var url = 'https://hooks.slack.com/services/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'
  const msg = user.first_name + ' ' + user.last_name + ' (' + user.email + ') requested a new\n*' + type + '*: ' + value
  sendSlack(url, msg)
}

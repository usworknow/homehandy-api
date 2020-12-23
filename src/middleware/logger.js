const { db } = require('../database/connection.js')

/* Remove any classified information from the response. */
module.exports.logger = async (body, req, res) => {
    try {
        if (req.body.password) { req.body.password = '******' }
        const data = {
            user_id: req.user ? req.user.id : null,
            status_code: Number(res.statusCode || 0),
            method: req.method,
            url: req.originalUrl,
            params: JSON.stringify(req.params),
            req_body: JSON.stringify(req.body),
            res_body: JSON.stringify(body)
        }
        if (data.url && data.url.indexOf('/api/v1') === 0) {
            await db('api_logs').insert(data)
        }
    } catch (error) {
        console.error('LOGGER', error)
    }
    return body;
}

const router = require('express').Router()
const EventEmitter = require('events')
const { db, TX } = require('../../database/connection.js')
const { self_or_admin, token, bare_token } = require('../../utilities/authenticate.js')
// const email_sender = require('../../../util/email.js')
const promap = require('../../utilities/promap.js')
// const sql = require('../../../sql/realtime.js')
const differenceInMinutes = require('date-fns/differenceInMinutes')

let emitter = new EventEmitter()

router.get('/:email/logs', token, self_or_admin, async (req, res) => {
  const email = req.params.email

  let query = db('notification_logs')
  if (req.query.new) { query = query.where({ email, read: false }) }
  else { query = query.where({ email }) }

  const notes = await query.select().orderBy('issued_at', 'desc').limit(req.query.limit || 100).offset(req.query.skip || 0)

  res.json(notes)

})

router.patch('/:email/logs', token, self_or_admin, async (req, res) => {
  if (req.body.read) {
    const read = Array.isArray(req.body.read) ? req.body.read : [req.body.read];
    await db('notification_logs').update({ read: true }).whereIn('id', read).andWhere({ email: req.params.email })
  }
  res.status(204).send()
})

router.get('/:email/chats', token, self_or_admin, async (req, res) => {
  const channels = await db.raw(sql.channels, { requester: req.params.email })

  if (!req.query.show_hidden) {
    const isCurrent = (channel) =>
      (channel.last_message && channel.last_message.id) > (channel.status && channel.status.last_seen);
    res.json(channels.rows.filter(channel => !channel.status.hidden || isCurrent(channel)))
  } else {
    res.json(channels.rows)
  }
})

router.get('/:email/chats/:channel_id', token, self_or_admin, async (req, res) => {
  const { rows: [messages] } = await db.raw(sql.channel_messages, { requester: req.params.email, channel_id: req.params.channel_id, limit: req.query.limit || 100, skip: req.query.skip || 0 })
  res.json(messages)
})

router.put('/:email/chats', token, self_or_admin, async (req, res) => {
  const { name, members } = req.body;
  if (!members || !Array.isArray(members)) return res.status(422).json({ error: 422, code: 'BAD_REQUEST', msg: "Member list required."})

  if (!members.includes(req.params.email)) members.push(req.params.email)

  const tx = await TX()
  try {
    const channel_id = parseInt(await tx('channels').insert({ name, channel_owner: req.params.email }).returning('id'))
    const allowed_members = await tx('profiles').select('email', 'first_name').whereIn('email', members).andWhereRaw(sql.filterAllowed, { requester: req.params.email })
    if (allowed_members.length !== members.length) {
      tx.rollback()
      return res.status(401).json({ error: 401, code: 'BAD_REQUEST', msg: 'Not permitted to chat with member.'})
    }
    await tx('channel_members').insert(allowed_members.map(member => ({ member_email: member.email, channel_id })))
    await tx.commit()

    return res.status(200).json({channel_id})
  } catch (e) {
    console.error(e);
    tx.rollback()
    return res.status(409).json({ error: 409, code: 'BAD_REQUEST', msg: "Cannot create chat."})
  }
})

/**
 * @api {patch} /profiles/:email Updates
 * @apiName PatchProfiles
 * @apiGroup Profiles
 *
 * @apiDescription Each field in the request body initiates a different update.
 * Multiple fields may be sent at once.
 *
 * @apiParam {QueryString} email User to operate on.
 * @apiParam {Object[]} [seen] Array of Seen objects, marks messages as read up to a point.
 * @apiParam {String} seen.channel_id Specifies channel to mark read.
 * @apiParam {String} seen.message_id Specifies message to mark as last_seen.
 * @apiParam {String[]} [hide_channels] Given an array of channel ids, hide them until new messages appear.
 * @apiParam {String[]} [unhide_channels] Given an array of channel ids, unhide them.
 *
 * @apiPermission self_or_admin
 *
 */
router.patch('/:email/chats', token, self_or_admin, async (req, res) => {
  try {
    if (req.body.hide_channels) {
      await promap(req.body.hide_channels, async channel_id => {
        await db('channel_members').update({ hidden: true }).where({ member_email: req.params.email, channel_id })
      })
    }
    if (req.body.unhide_channels) {
      await promap(req.body.unhide_channels, async channel_id => {
        await db('channel_members').update({ hidden: false }).where({ member_email: req.params.email, channel_id })
      })
    }
    if (req.body.seen) {
      await promap(req.body.seen, async ({ channel_id, message_id: last_seen }) => {
        await db('channel_members').update({ last_seen }).where({ member_email: req.params.email, channel_id })
      })
    }
    res.status(204)
  } catch (e) {
    console.error(e)
    res.status(500)
  }
  res.send()
})

const auth = (pass, fail) => (event) => {
  if (event === 'close') return fail('Closed connection.');
  const message = JSON.parse(event)
  if (message.type.toLowerCase() === 'authorization') {
    bare_token(message.data).then(pass).catch(fail)
  } else return;
}

const handle_message_ = (user) => async (msg) => {
  const message = JSON.parse(msg)
  if (message.type === "chat_message") {
    const {rows:[{exists}]} = await db.raw(`SELECT exists(SELECT FROM channel_members WHERE member_email = ? AND channel_id = ?)`, [user.email, message.channel_id])
    if (exists) send_chat_message(message.channel_id, message.message, user.email)
  }
}

router.ws('/:email', async (ws, req) => {
  const heartbeat = setInterval(() => ws.ping('{ "type": "ping" }'), 15000)
  const send = (event) => {
    ws.send(JSON.stringify(event))
  }
  let auth_fn;
  const auth_promise = new Promise((pass, fail) => {
    auth_fn = auth(pass, fail)
  })
  ws.on('message', auth_fn)
  ws.once('close', ()=> auth_fn('close'))
  ws.once('close', () => {
    clearInterval(heartbeat)
    if (emitter) emitter.removeListener(req.params.email, send)
  })
  let user;
  try {
    user = await auth_promise
    ws.removeListener('message', auth_fn)
    ws.removeListener('close', auth_fn)
    const handle_message = handle_message_(user)
    ws.on('message', handle_message)
    ws.once('close', () => {
      ws.removeListener('message', handle_message)
    })
    ws.send(JSON.stringify({ "type": "authorization", "data": { "success": true, "user": user.email } }))
  } catch (e) {
    if (e === "Closed connection.") return;
    if (e.message === 'Invalid token.') {
      ws.send(JSON.stringify({ "type": "error", "data": { "error": 401, "msg": "Invalid token." } }))
      ws.close()
      return;
    } else {
      console.error(e)
      ws.send(JSON.stringify({ type: "error", "data": { "error": 500, "msg": "Unknown error." } }))
      ws.close()
      return;
    }
  }
  emitter.on(req.params.email, send)
})


module.exports = router

const send_event = (type) => (to, raw_data) => {
  const data = JSON.stringify(raw_data)
  db('notification_logs')
    .insert({ email: to, data, type, read: false })
    .returning('id')
    .catch(err => {
      console.error("Couldn't save message: " + data)
      console.error(err)
    }).then(([id]) => {
        emitter.emit(to, { data: raw_data, type, read: false, id })
    }).catch(err => {
      console.error("Transport error: " + data)
      console.error(err)
    })
}

module.exports.send_we_have_played_together = send_event('we_have_played_together')
module.exports.send_tagged_in_post = send_event('tagged_in_post')
module.exports.send_play_golf_notification = send_event('play_golf')
module.exports.send_travel_notification = send_event('travel')
module.exports.send_group_invite = send_event('group_invite')
module.exports.send_public_group_request = send_event('public_group_request')
module.exports.send_new_group_member = send_event('new_group_member')

const send_chat_message = async (channel, message, sender_email) => {
  const channel_members = await db('channel_members').select('member_email').where({ channel_id: channel })//.andWhereNot({ member_email: sender_email })

  const sender = await db('profiles').first('username', 'profile_image', 'last_name', 'first_name').where({email: sender_email})

  const data =
    { channel_id: channel
    , message
    , sender_username: sender.username
    , sender_email
    , sender_profile_image: sender.profile_image
    , sender_last_name: sender.last_name
    , sender_first_name: sender.first_name
    }

  const [ { id, issued_at } ] = await db('messages').insert(data).returning(['id', 'issued_at'])

  channel_members.filter(x => x.member_email !== sender_email).forEach(async (to) => {
    const receiver_email = to.member_email
    const recentChats = await db.raw(sql.recent_chats, { channel_id: channel, sender_email, receiver_email })
    // *****
    // checking for read/unread requires looking at channel_members table for "last_seen" message id
    // console.log('RECENTS: ', recentChats.rows)
    // *****
    if (recentChats.rows.length === 0 || (differenceInMinutes(new Date(), recentChats.rows[0].issued_at) > 60)) {
      const recipient = await db('profiles').first('email', 'first_name').where({ email: receiver_email })
      email_sender.message_received_email(recipient, sender.first_name + ' ' + sender.last_name, message)
    }
  })
  const notes = channel_members.map(to =>
    ({ email: to
      , data: JSON.stringify(
        { id
        , issued_at
        , ...data
        }
      )
      , type:'chat_message'
      , read: false
    })
  )

  await db('notification_logs')
    .insert(notes)

  data.id = id
  data.issued_at = issued_at

  channel_members.forEach(({ member_email: to }) => {
    emitter.emit(to, { data: data, type: 'chat_message' })
  })

}

module.exports.send_chat_message

module.exports.teardown = (cb) => {
  emitter.removeAllListeners();
  emitter = undefined;
  cb(!emitter)

}
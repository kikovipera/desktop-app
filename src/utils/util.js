import crypto from 'crypto'
import Bot from 'bot-api-js-client'
import moment from 'moment'
import store from '@/store/store'
import fs from 'fs'
export function generateConversationId(userId, recipientId) {
  userId = userId.toString()
  recipientId = recipientId.toString()

  let [minId, maxId] = [userId, recipientId]
  if (minId > maxId) {
    ;[minId, maxId] = [recipientId, userId]
  }

  const hash = crypto.createHash('md5')
  hash.update(minId)
  hash.update(maxId)
  const bytes = hash.digest()

  bytes[6] = (bytes[6] & 0x0f) | 0x30
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const digest = Array.from(bytes, byte => `0${(byte & 0xff).toString(16)}`.slice(-2)).join('')
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(
    20,
    32
  )}`
}

export function getToken(method, uri, data) {
  const privateKey = localStorage.getItem('sessionToken')
  const account = JSON.parse(localStorage.getItem('account'))
  let token = ''
  if (typeof data === 'object') {
    data = JSON.stringify(data)
  } else {
    data = ''
  }
  if (account && privateKey) {
    const uid = account.user_id
    const sid = account.session_id
    const m = method.toUpperCase()
    const scp =
      'PROFILE:READ PROFILE:WRITE PHONE:READ PHONE:WRITE CONTACTS:READ CONTACTS:WRITE MESSAGES:READ MESSAGES:WRITE'
    token = new Bot().signAuthenticationToken(uid, sid, privateKey, m, uri, data, scp)
  }
  return token
}

export function hexToBytes(hex) {
  var bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

export const readArrayBuffer = data => {
  const temporaryFileReader = new FileReader()
  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort()
      reject(new DOMException('Problem parsing input data.'))
    }

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result)
    }
    temporaryFileReader.readAsArrayBuffer(data)
  })
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export function timeAgo(time) {
  const date = new Date(time)
  const now = new Date()
  const offset = now - date
  if (offset > 7 * 24 * 60 * 60 * 1000) {
    return months[date.getMonth]
  } else if (offset > 24 * 60 * 60 * 1000) {
    return days[date.getDay]
  } else if (date.getDay !== now.getDay) {
    return 'Yesterday'
  } else {
    return moment(time).format('HH:mm')
  }
}

export function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  let bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function sendNotification(title, body, conversationId) {
  let newNotification = new Notification(title, {
    body: body
  })
  newNotification.onclick = () => {
    store.dispatch('setCurrentConversation', conversationId)
  }
}

export function getOrientation(file) {
  let result = fs.readFileSync(file).slice(0, 64 * 1024)
  var view = new DataView(toArrayBuffer(result))

  if (view.getUint16(0, false) !== 0xffd8) {
    return -2
  }

  var length = view.byteLength
  var offset = 2

  while (offset < length) {
    var marker = view.getUint16(offset, false)
    offset += 2

    if (marker === 0xffe1) {
      if (view.getUint32((offset += 2), false) !== 0x45786966) {
        return -1
      }
      var little = view.getUint16((offset += 6), false) === 0x4949
      offset += view.getUint32(offset + 4, little)
      var tags = view.getUint16(offset, little)
      offset += 2

      for (var i = 0; i < tags; i++) {
        if (view.getUint16(offset + i * 12, little) === 0x0112) {
          return view.getUint16(offset + i * 12 + 8, little)
        }
      }
    } else if ((marker & 0xff00) !== 0xff00) break
    else offset += view.getUint16(offset, false)
  }
  return -1
}

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')
const http = require('http')
const { AccessToken } = require('livekit-server-sdk')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

const GROUP_ROOMS = ['general']

// roomName -> Set<ws>
const roomClients = new Map()
GROUP_ROOMS.forEach(r => roomClients.set(r, new Set()))

// ws -> { userName }
const clientMeta = new Map()

function broadcastUserList() {
  const users = Array.from(clientMeta.values())
    .map(m => m.userName)
    .filter(Boolean)
  const msg = JSON.stringify({ type: 'USER_LIST', users })
  for (const ws of clientMeta.keys()) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

app.get('/rooms', (req, res) => {
  res.json({ rooms: GROUP_ROOMS, livekitUrl: LIVEKIT_URL })
})

app.get('/token/:roomName', async (req, res) => {
  const { roomName } = req.params
  const { userName } = req.query
  if (!userName) return res.status(400).json({ error: 'userName is required' })

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userName,
    ttl: '24h',
  })
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  const token = await at.toJwt()
  res.json({ token, livekitUrl: LIVEKIT_URL })
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  clientMeta.set(ws, { userName: null })

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    const meta = clientMeta.get(ws)

    if (msg.type === 'IDENTIFY') {
      meta.userName = msg.userName
      broadcastUserList()
    }
    if (msg.type === 'ROOM_JOIN') {
      const { roomName } = msg
      if (!roomClients.has(roomName)) roomClients.set(roomName, new Set())
      roomClients.get(roomName).add(ws)
    }
    if (msg.type === 'ROOM_LEAVE') {
      roomClients.get(msg.roomName)?.delete(ws)
    }
    if (msg.type === 'PTT_START' || msg.type === 'PTT_END') {
      const { roomName } = msg
      const outType = msg.type === 'PTT_START' ? 'SPEAKING_START' : 'SPEAKING_END'
      const out = JSON.stringify({ type: outType, roomName, userName: meta.userName })
      const clients = roomClients.get(roomName) || new Set()
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) client.send(out)
      }
    }
  })

  ws.on('close', () => {
    const meta = clientMeta.get(ws)
    for (const set of roomClients.values()) set.delete(ws)
    clientMeta.delete(ws)
    if (meta?.userName) broadcastUserList()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PTT backend (HTTP) on port ${PORT}`)
  console.log(`Rooms: ${GROUP_ROOMS.join(', ')}`)
})

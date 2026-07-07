import { defineStore } from 'pinia'
import { useLiveKit } from '../composables/useLiveKit'

export function p2pRoomName(a, b) {
  return 'p2p-' + [a, b].sort().join('-')
}

export const usePTTStore = defineStore('ptt', {
  state: () => ({
    ws: null,
    userName: '',
    livekitUrl: '',
    onlineUsers: [],
    activeRoom: null,
    speakingUsers: {},
    wsReady: false,
    // track which LiveKit rooms we have already joined
    _joinedRooms: new Set(),
  }),

  actions: {
    connectWS(userName) {
      this.userName = userName
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${window.location.host}/ws`

      return new Promise((resolve) => {
        const ws = new WebSocket(url)

        ws.onopen = () => {
          this.ws = ws
          this.wsReady = true
          ws.send(JSON.stringify({ type: 'IDENTIFY', userName }))
          resolve()
        }

        ws.onmessage = ({ data }) => {
          let msg
          try { msg = JSON.parse(data) } catch { return }
          this._handleMessage(msg)
        }

        ws.onclose = () => {
          this.wsReady = false
          this.ws = null
        }
      })
    },

    _handleMessage(msg) {
      if (msg.type === 'USER_LIST') {
        const others = msg.users.filter(u => u !== this.userName)
        this.onlineUsers = others

        // silently join any new p2p rooms we haven't joined yet
        if (this.livekitUrl) {
          for (const other of others) {
            const roomName = p2pRoomName(this.userName, other)
            if (!this._joinedRooms.has(roomName)) {
              this._joinP2PRoom(roomName)
            }
          }
        }
      }

      if (msg.type === 'SPEAKING_START') {
        const set = new Set(this.speakingUsers[msg.roomName] || [])
        set.add(msg.userName)
        this.speakingUsers = { ...this.speakingUsers, [msg.roomName]: set }
      }
      if (msg.type === 'SPEAKING_END') {
        const set = new Set(this.speakingUsers[msg.roomName] || [])
        set.delete(msg.userName)
        this.speakingUsers = { ...this.speakingUsers, [msg.roomName]: set }
      }
    },

    // join a p2p LiveKit room + register with WS backend
    async _joinP2PRoom(roomName) {
      if (this._joinedRooms.has(roomName)) return
      this._joinedRooms.add(roomName) // mark early to prevent duplicate calls

      try {
        const { joinRoom } = useLiveKit()
        const tr = await fetch(`/token/${roomName}?userName=${encodeURIComponent(this.userName)}`)
        const { token, livekitUrl } = await tr.json()
        await joinRoom(livekitUrl, token, roomName)
        this.joinRoom(roomName)
      } catch (e) {
        this._joinedRooms.delete(roomName) // allow retry on failure
        console.error('Failed to join p2p room', roomName, e)
      }
    },

    joinRoom(roomName) {
      this.ws?.send(JSON.stringify({ type: 'ROOM_JOIN', roomName }))
    },

    leaveRoom(roomName) {
      this.ws?.send(JSON.stringify({ type: 'ROOM_LEAVE', roomName }))
    },

    sendPTTStart(roomName) {
      this.ws?.send(JSON.stringify({ type: 'PTT_START', roomName }))
    },

    sendPTTEnd(roomName) {
      this.ws?.send(JSON.stringify({ type: 'PTT_END', roomName }))
    },

    setActiveRoom(roomName) {
      this.activeRoom = roomName
    },

    setLivekitUrl(url) {
      this.livekitUrl = url
    },

    markJoined(roomName) {
      this._joinedRooms.add(roomName)
    },
  },
})

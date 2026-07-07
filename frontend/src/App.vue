<template>
  <v-app>
    <!-- Login Screen -->
    <v-dialog v-model="showLogin" persistent max-width="400">
      <v-card class="pa-4">
        <v-card-title class="justify-center">
          <v-icon large color="primary" class="mr-2">mdi-radio</v-icon>
          PTT Radio
        </v-card-title>
        <v-card-subtitle class="text-center">Push-to-Talk Communication</v-card-subtitle>
        <v-card-text>
          <v-text-field
            v-model="nameInput"
            label="Your display name"
            outlined
            autofocus
            :disabled="joining"
            @keyup.enter="enter"
          />
          <v-alert v-if="loginError" type="error" dense>{{ loginError }}</v-alert>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            color="primary"
            large
            :loading="joining"
            :disabled="!nameInput.trim()"
            @click="enter"
          >
            Enter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Main App -->
    <template v-if="!showLogin">
      <v-navigation-drawer app permanent width="260" color="grey darken-4">
        <!-- Header -->
        <v-list-item class="px-4 py-3">
          <v-list-item-icon>
            <v-icon color="primary">mdi-radio</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="text-h6">PTT Radio</v-list-item-title>
            <v-list-item-subtitle>{{ store.userName }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <v-divider />

        <!-- Group Channels -->
        <v-subheader>Channels</v-subheader>
        <v-list dense nav>
          <v-list-item>
            <v-list-item-icon>
              <v-icon small>mdi-account-group</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title># general</v-list-item-title>
              <v-list-item-subtitle>
                <speaking-indicator :speaking-set="store.speakingUsers['general']" />
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <p-t-t-button room-name="general" :compact="true" />
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-divider />

        <!-- Online Users (P2P) -->
        <v-subheader>
          Direct —
          <v-chip x-small class="ml-1" color="success" text-color="white">
            {{ store.onlineUsers.length }} online
          </v-chip>
        </v-subheader>

        <v-list dense nav>
          <v-list-item v-if="store.onlineUsers.length === 0" disabled>
            <v-list-item-content>
              <v-list-item-subtitle class="grey--text">No one else online</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            v-for="user in store.onlineUsers"
            :key="user"
          >
            <v-list-item-icon>
              <v-badge dot color="success" overlap>
                <v-icon small>mdi-account</v-icon>
              </v-badge>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ user }}</v-list-item-title>
              <v-list-item-subtitle>
                <speaking-indicator :speaking-set="store.speakingUsers[p2pName(user)]" />
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <p-t-t-button :room-name="p2pName(user)" :compact="true" />
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <!-- Main Area -->
      <v-main>
        <v-container fill-height class="justify-center align-center">
          <div class="text-center grey--text">
            <v-icon size="80" color="grey darken-1">mdi-radio</v-icon>
            <div class="mt-4 text-h6">PTT Radio</div>
            <div class="mt-2 body-2">Hold the mic button next to any channel or user to talk</div>
            <div class="mt-6 caption">Signed in as <strong class="white--text">{{ store.userName }}</strong></div>
          </div>
        </v-container>
      </v-main>
    </template>
  </v-app>
</template>

<script>
import { usePTTStore, p2pRoomName } from './stores/ptt'
import { useLiveKit } from './composables/useLiveKit' // used in enter()
import SpeakingIndicator from './components/SpeakingIndicator.vue'
import PTTButton from './components/PTTButton.vue'

export default {
  name: 'App',
  components: { SpeakingIndicator, PTTButton },

  data() {
    return {
      showLogin: true,
      nameInput: '',
      joining: false,
      loginError: '',
    }
  },

  computed: {
    store() { return usePTTStore() },
  },

  methods: {
    p2pName(otherUser) {
      return p2pRoomName(this.store.userName, otherUser)
    },

    async enter() {
      const name = this.nameInput.trim()
      if (!name) return

      // unlock AudioContext on user gesture
      try { await new AudioContext().resume() } catch {}

      this.joining = true
      this.loginError = ''

      try {
        // 1. fetch livekit url first so the store can use it in USER_LIST handler
        const res = await fetch('/rooms')
        const data = await res.json()
        this.store.setLivekitUrl(data.livekitUrl)

        // 2. connect WebSocket — server sends USER_LIST immediately after IDENTIFY,
        //    store auto-joins all p2p rooms for online users at that point
        await this.store.connectWS(name)

        // 3. join the group room(s)
        const { joinRoom } = useLiveKit()
        await Promise.all(
          data.rooms.map(async (roomName) => {
            const tr = await fetch(`/token/${roomName}?userName=${encodeURIComponent(name)}`)
            const { token, livekitUrl } = await tr.json()
            await joinRoom(livekitUrl, token, roomName)
            this.store.joinRoom(roomName)
            this.store.markJoined(roomName)
          })
        )

        this.showLogin = false
      } catch (e) {
        this.loginError = e.message || 'Failed to connect. Is the backend running?'
      } finally {
        this.joining = false
      }
    },

  },
}
</script>

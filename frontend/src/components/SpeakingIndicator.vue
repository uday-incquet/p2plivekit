<template>
  <div>
    <v-chip
      v-if="speakers.length"
      small
      color="success"
      text-color="white"
      class="ma-1 speaking-pulse"
    >
      <v-icon left small>mdi-microphone</v-icon>
      {{ speakers.join(', ') }}
    </v-chip>
    <span v-else class="caption grey--text">No one speaking</span>
  </div>
</template>

<script>
export default {
  name: 'SpeakingIndicator',
  props: {
    speakingSet: {
      default: () => new Set(),
    },
  },
  computed: {
    speakers() {
      return this.speakingSet ? Array.from(this.speakingSet) : []
    },
  },
}
</script>

<style scoped>
.speaking-pulse {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

<template>
  <div :class="compact ? 'ptt-inline' : 'ptt-wrapper'">
    <v-btn
      ref="btn"
      :fab="!compact"
      :icon="compact"
      :x-large="!compact"
      :small="compact"
      :color="pressing ? 'error' : 'primary'"
      :class="{ 'ptt-active': pressing && !compact }"
    >
      <v-icon :size="compact ? 20 : 40">
        {{ pressing ? 'mdi-microphone' : 'mdi-microphone-outline' }}
      </v-icon>
    </v-btn>
    <div v-if="!compact" class="ptt-label mt-3 text-center caption">
      {{ pressing ? 'Release to stop' : 'Hold to talk' }}
    </div>
  </div>
</template>

<script>
import { usePTT } from '../composables/usePTT'

export default {
  name: 'PTTButton',
  props: {
    roomName: { type: String, required: true },
    compact: { type: Boolean, default: false },
  },
  data() {
    return { pressing: false, unbind: null }
  },
  mounted() {
    const { startPTT, endPTT } = usePTT()
    const el = this.$refs.btn.$el

    const onStart = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.pressing = true
      await startPTT(this.roomName)
    }
    const onEnd = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!this.pressing) return
      this.pressing = false
      await endPTT(this.roomName)
    }

    el.addEventListener('mousedown', onStart)
    el.addEventListener('mouseup', onEnd)
    el.addEventListener('mouseleave', onEnd)
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)

    this.unbind = () => {
      el.removeEventListener('mousedown', onStart)
      el.removeEventListener('mouseup', onEnd)
      el.removeEventListener('mouseleave', onEnd)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  },
  beforeDestroy() {
    this.unbind?.()
  },
}
</script>

<style scoped>
.ptt-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ptt-inline {
  display: flex;
  align-items: center;
}
.ptt-active {
  transform: scale(1.12);
  box-shadow: 0 0 0 12px rgba(244, 67, 54, 0.25) !important;
}
</style>

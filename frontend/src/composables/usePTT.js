import { useLiveKit } from './useLiveKit'
import { usePTTStore } from '../stores/ptt'

export function usePTT() {
  const store = usePTTStore()
  const { enableMic, disableMic } = useLiveKit()

  let pressing = false

  async function startPTT(roomName) {
    if (pressing) return
    pressing = true
    await enableMic(roomName)
    store.sendPTTStart(roomName)
  }

  async function endPTT(roomName) {
    if (!pressing) return
    pressing = false
    await disableMic(roomName)
    store.sendPTTEnd(roomName)
  }

  function bindButton(el, roomName) {
    const onStart = (e) => { e.preventDefault(); startPTT(roomName) }
    const onEnd = (e) => { e.preventDefault(); endPTT(roomName) }

    el.addEventListener('mousedown', onStart)
    el.addEventListener('mouseup', onEnd)
    el.addEventListener('mouseleave', onEnd)
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)

    return () => {
      el.removeEventListener('mousedown', onStart)
      el.removeEventListener('mouseup', onEnd)
      el.removeEventListener('mouseleave', onEnd)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }

  return { startPTT, endPTT, bindButton }
}

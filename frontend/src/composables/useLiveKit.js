import { Room, RoomEvent, Track, createLocalAudioTrack } from 'livekit-client'

// roomName -> Room instance
const rooms = new Map()
// roomName -> LocalAudioTrack
const localTracks = new Map()

export function useLiveKit() {
  async function joinRoom(livekitUrl, token, roomName) {
    if (rooms.has(roomName)) return

    const room = new Room({
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
      adaptiveStream: true,
      dynacast: true,
    })

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio) return
      const el = document.createElement('audio')
      el.autoplay = true
      track.attach(el)
      document.body.appendChild(el)
    })

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach()
    })

    // join with mic off
    await room.connect(livekitUrl, token, { autoSubscribe: true })

    // create local audio track but don't publish yet (mic off = PTT idle)
    const audioTrack = await createLocalAudioTrack()
    localTracks.set(roomName, audioTrack)

    rooms.set(roomName, room)
  }

  async function enableMic(roomName) {
    const room = rooms.get(roomName)
    const track = localTracks.get(roomName)
    if (!room || !track) return

    // publish if not already published
    const existing = room.localParticipant.getTrackPublications()
      .find(p => p.kind === Track.Kind.Audio)

    if (!existing) {
      await room.localParticipant.publishTrack(track)
    } else {
      await existing.track?.unmute()
    }
  }

  async function disableMic(roomName) {
    const room = rooms.get(roomName)
    if (!room) return

    const pub = Array.from(room.localParticipant.trackPublications.values())
      .find(p => p.kind === Track.Kind.Audio)

    if (pub?.track) {
      await pub.track.mute()
    }
  }

  async function leaveRoom(roomName) {
    const room = rooms.get(roomName)
    if (room) {
      await room.disconnect()
      rooms.delete(roomName)
    }
    localTracks.delete(roomName)
  }

  return { joinRoom, enableMic, disableMic, leaveRoom }
}

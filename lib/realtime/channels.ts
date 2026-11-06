// Shared by the server and the browser. Events carry only a version number,
// never room content. Clients refetch the room view over HTTP when told to.

export const ROOM_EVENT = "room.changed"

const CHANNEL_PREFIX = "private-room-"

export function roomChannel(code: string) {
  return `${CHANNEL_PREFIX}${code}`
}

export function roomCodeFromChannel(channel: string) {
  if (!channel.startsWith(CHANNEL_PREFIX)) return null
  const code = channel.slice(CHANNEL_PREFIX.length)
  return /^[A-Z0-9]{8}$/.test(code) ? code : null
}

export type RoomChangedEvent = { version: number }

export type RealtimeConfig = { key: string; cluster: string }

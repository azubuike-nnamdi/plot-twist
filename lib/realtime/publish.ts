import "server-only"

import { after } from "next/server"

import { env } from "@/lib/env"
import { ROOM_EVENT, roomChannel, type RealtimeConfig } from "@/lib/realtime/channels"
import { signedEventQuery } from "@/lib/realtime/sign"

const PUBLISH_TIMEOUT_MS = 3_000

function serverConfig() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null
  return { appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER }
}

/** What the browser needs to connect, or null when push is not configured. */
export function publicRealtimeConfig(): RealtimeConfig | null {
  const config = serverConfig()
  return config ? { key: config.key, cluster: config.cluster } : null
}

export function realtimeSecrets() {
  return serverConfig()
}

async function trigger(code: string, version: number) {
  const config = serverConfig()
  if (!config) return
  const body = JSON.stringify({
    name: ROOM_EVENT,
    channel: roomChannel(code),
    data: JSON.stringify({ version }),
  })
  const { path, query } = signedEventQuery({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    body,
    timestamp: Math.floor(Date.now() / 1000),
  })
  const response = await fetch(`https://api-${config.cluster}.pusher.com${path}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Pusher responded ${response.status}`)
}

/**
 * Tell everyone in these rooms that the room moved. It runs after the response
 * so the player who acted is not kept waiting. Polling still covers anyone
 * who misses the signal, so a failed publish is logged and dropped.
 */
export function publishRoomChanges(changes: { code: string; version: number }[]) {
  if (changes.length === 0 || !serverConfig()) return
  const send = async () => {
    const results = await Promise.allSettled(
      changes.map((change) => trigger(change.code, change.version))
    )
    if (results.some((result) => result.status === "rejected")) {
      console.error("Realtime publish failed for some rooms")
    }
  }
  try {
    after(send)
  } catch {
    // Outside a request (scripts, cron helpers): send without blocking.
    void send()
  }
}

"use client"

import { useEffect, useRef, useState } from "react"

import {
  ROOM_EVENT,
  roomChannel,
  type RealtimeConfig,
  type RoomChangedEvent,
} from "@/lib/realtime/channels"

/**
 * Subscribes to the room's push channel. Calls `onChange` with the new version
 * whenever the server says the room moved. Returns true while the socket is
 * connected and subscribed, so the caller can slow its polling to a safety net.
 * Without a config (push not set up) it does nothing and returns false.
 */
export function useRoomChannel(
  code: string,
  config: RealtimeConfig | null,
  onChange: (version: number) => void
) {
  const [connected, setConnected] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const handler = useRef(onChange)
  useEffect(() => {
    handler.current = onChange
  }, [onChange])

  const key = config?.key ?? null
  const cluster = config?.cluster ?? null
  useEffect(() => {
    if (!key || !cluster) return
    let cancelled = false
    let disconnect: (() => void) | null = null
    void import("pusher-js").then(({ default: Pusher }) => {
      if (cancelled) return
      const client = new Pusher(key, {
        cluster,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],
        channelAuthorization: { endpoint: "/api/realtime/auth", transport: "ajax" },
      })
      client.connection.bind("state_change", (states: { current: string }) => {
        setConnected(states.current === "connected")
      })
      const channel = client.subscribe(roomChannel(code))
      channel.bind("pusher:subscription_succeeded", () => setSubscribed(true))
      channel.bind("pusher:subscription_error", () => setSubscribed(false))
      channel.bind(ROOM_EVENT, (data: RoomChangedEvent) => {
        const version = Number(data?.version)
        if (Number.isFinite(version)) handler.current(version)
      })
      disconnect = () => client.disconnect()
    })
    return () => {
      cancelled = true
      disconnect?.()
      setConnected(false)
      setSubscribed(false)
    }
  }, [code, key, cluster])

  return connected && subscribed
}

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export function roomQueryKey(code: string) {
  return ["room", code] as const
}

/** Refetch the room right away instead of waiting for the next poll. */
export function useRefreshRoom(code: string) {
  const client = useQueryClient()
  return useCallback(
    () => client.invalidateQueries({ queryKey: roomQueryKey(code) }),
    [client, code]
  )
}

/**
 * Wraps a server action for a `<form action>` so the room refreshes as soon as
 * the action returns. The person who acted sees the result without a poll gap.
 */
export function useRoomAction(code: string) {
  const refresh = useRefreshRoom(code)
  return useCallback(
    <A extends unknown[]>(run: (...args: A) => Promise<unknown>, ...args: A) =>
      async () => {
        await run(...args)
        await refresh()
      },
    [refresh]
  )
}

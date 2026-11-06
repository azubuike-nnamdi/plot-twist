import { createHash, createHmac } from "node:crypto"

// Pusher Channels signing, implemented directly so the server needs no SDK.
// https://pusher.com/docs/channels/library_auth_reference/rest-api/

export function md5(body: string) {
  return createHash("md5").update(body).digest("hex")
}

export function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex")
}

/** Query string for POST /apps/{appId}/events, including auth_signature. */
export function signedEventQuery(input: {
  appId: string
  key: string
  secret: string
  body: string
  timestamp: number
}) {
  const params: Record<string, string> = {
    auth_key: input.key,
    auth_timestamp: String(input.timestamp),
    auth_version: "1.0",
    body_md5: md5(input.body),
  }
  const query = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&")
  const path = `/apps/${input.appId}/events`
  const signature = hmac(input.secret, `POST\n${path}\n${query}`)
  return { path, query: `${query}&auth_signature=${signature}` }
}

/** Response body for a private channel subscription. */
export function channelAuth(input: {
  key: string
  secret: string
  socketId: string
  channel: string
}) {
  return { auth: `${input.key}:${hmac(input.secret, `${input.socketId}:${input.channel}`)}` }
}

export function isSocketId(value: string) {
  return /^\d{1,20}\.\d{1,20}$/.test(value)
}

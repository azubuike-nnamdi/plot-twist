/**
 * Headers that carry the client IP, in order of trust. On Vercel both are set by
 * the edge: x-real-ip is the client address, and x-forwarded-for is overwritten.
 * Behind another proxy, make sure it sets x-real-ip and strips client copies.
 */
export const CLIENT_IP_HEADERS = ["x-real-ip", "x-forwarded-for"]

type HeaderReader = { get(name: string): string | null }

const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/

function clean(value: string | null | undefined) {
  const ip = value?.trim()
  return ip && IP_PATTERN.test(ip) ? ip : null
}

/**
 * Resolve the client IP for rate limiting. A client can prepend anything to
 * x-forwarded-for, so this never reads the first entry of a multi-hop list. It
 * takes the last entry, which the nearest proxy appended.
 */
export function clientIpFrom(headers: HeaderReader) {
  const real = clean(headers.get("x-real-ip"))
  if (real) return real
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const hops = forwarded.split(",")
    const last = clean(hops[hops.length - 1])
    if (last) return last
  }
  return "unknown"
}

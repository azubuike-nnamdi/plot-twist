const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function createRoomCode(bytes = crypto.getRandomValues(new Uint8Array(8))) {
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join(
    ""
  )
}

export function formatRoomCode(code: string) {
  return `TWST-${code}`
}

export function parseRoomCode(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/^TWST-/, "")
    .replace(/[^A-Z2-9]/g, "")
}

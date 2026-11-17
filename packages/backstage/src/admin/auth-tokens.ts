const HEX = { radix: 16, width: 2, padding: '0' } as const

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(HEX.radix).padStart(HEX.width, HEX.padding)).join('')

export const randomToken = (byteLength: number) =>
  toHex(crypto.getRandomValues(new Uint8Array(byteLength)))

export const sha256Hex = async (value: string) =>
  toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))

import { crc32, deflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const COLOR_TYPE_RGB = 2
const BIT_DEPTH = 8

const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, checksum])
}

export const solidPng = (size: number, rgb: readonly [number, number, number]) => {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = BIT_DEPTH
  header[9] = COLOR_TYPE_RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill(rgb).flat())])
  const pixels = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

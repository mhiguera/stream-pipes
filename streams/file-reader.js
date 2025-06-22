import { createReadStream } from 'fs'
import { PassThrough } from 'stream'
import zlib from 'zlib'

export function createFileReader(file, options = {}) {
  const decompress = file.endsWith('.gz') ? zlib.createGunzip() : new PassThrough()
  return createReadStream(file, options).pipe(decompress)
}
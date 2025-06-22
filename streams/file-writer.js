import fs from 'fs'
import zlib from 'zlib'

export function createFileWriter(path, options = {}) {
  const fileStream = fs.createWriteStream(path, { encoding: 'utf8', ...options })
  if (path.endsWith('.gz')) {
    const gzip = zlib.createGzip()
    gzip.pipe(fileStream)
    return gzip
  }
  return fileStream
}

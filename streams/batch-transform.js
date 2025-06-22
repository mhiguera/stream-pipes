import { Transform } from 'stream'

export default class BatchStream extends Transform {
  constructor(batchSize = 100) {
    super({ objectMode: true })
    this.batchSize = batchSize
    this.buffer = []
  }

  _transform(chunk, _, callback) {
    this.buffer.push(chunk)
    if (this.buffer.length >= this.batchSize) {
      this.push([...this.buffer])
      this.buffer = []
    }
    callback()
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      this.push([...this.buffer])
    }
    callback()
  }
}


export function createBatchTransform(options) {
  return new BatchStream(options)
}

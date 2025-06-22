import readline from 'readline'
import { PassThrough, Transform } from 'stream'

export default class LineReader extends Transform {
  constructor(options = {}) {
    super({ objectMode: true, ...options })
    this.passThrough = new PassThrough()
    this.rl = readline.createInterface({ input: this.passThrough })
    this.rl.on('line', line => this.processLine(line))
    this.rl.on('close', () => this.push(null))
  }

  _flush(callback) {
    this.passThrough.end()
    this.rl.once('close', () => callback())
  }

  _transform(chunk, encoding, callback) {
    this.passThrough.write(chunk, encoding, callback)
  }

  processLine(line) {
    this.push(line)
  }
}

export function createLineReader(options) {
  return new LineReader(options)
}
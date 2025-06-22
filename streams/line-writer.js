import { Transform } from 'stream'
const NEW_LINE = '\n'

export default class LineWriter extends Transform {
  constructor(options = {}) {
    super({ writableObjectMode: true, ...options })
  }

  _transform(chunk, _, callback) {
    try {
      const str = typeof chunk === 'string' ? chunk : String(chunk)
      this.push(str + NEW_LINE)
      callback()
    } catch (err) {
      callback(err)
    }
  }
}

export function createLineWriter(options) {
  return new LineWriter(options)
}

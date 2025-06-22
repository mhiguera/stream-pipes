import { Transform } from 'stream'
const NEW_LINE = '\n'

export default class ObjectToJsonTransform extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(object, _, callback) {
    this.push(JSON.stringify(object) + NEW_LINE)
    callback()
  }
}

export function createJsonTransform(options) {
  return new ObjectToJsonTransform(options)
}
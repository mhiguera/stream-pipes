import { Transform } from 'stream'

export default class ObjectTransform extends Transform {
  constructor(transformFunction, options) {
    super({ objectMode: true, ...options })
    this.transformFunction = transformFunction
    this.providePush = transformFunction.length > 1
  }

  async _transform(object, _, callback) {
    try {
      if (this.providePush) {
        const pushFn = this.push.bind(this)
        await this.transformFunction(object, pushFn)
      } else {
        const result = await this.transformFunction(object)
        if (result !== undefined) this.push(result)
      }
      callback()
    } catch (err) {
      callback(err)
    }
  }
}

export function createMapTransform(transformFunction) {
  return new ObjectTransform(transformFunction)
}
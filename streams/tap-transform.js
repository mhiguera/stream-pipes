import { Transform } from 'stream'

class TapTransform extends Transform {
  constructor(sideEffectFn, options = {}) {
    super({ objectMode: true, ...options })
    this.sideEffectFn = sideEffectFn
  }

  async _transform(object, _, callback) {
    try {
      await this.sideEffectFn(object)
      this.push(object)
      callback()
    } catch (err) {
      callback(err)
    }
  }
}

export function createTapTransform(sideEffectFn) {
  return new TapTransform(sideEffectFn)
}

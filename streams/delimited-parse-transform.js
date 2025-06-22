import LineReader from './line-reader.js'

const DEFAULT_DELIMITER = ','

export default class DelimitedToObjectTransform extends LineReader {
  constructor(options = {}) {
    super({ objectMode: true })
    this.delimiter = options.delimiter || DEFAULT_DELIMITER
    this.regex = new RegExp(`(?:^|${this.delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^${this.delimiter}]*))`, 'g')
  }

  extractValues(line) {
    return [...line.matchAll(this.regex)].map((m) => (m[1] || m[2] || '').replace('""', '"'))
  }

  processLine(line) {
    const values = this.extractValues(line)
    if (!this.headersWritten) {
      this.headers = values
      this.headersWritten = true
      return
    }

    const object = this.headers.reduce((object, headerName, index) => {
      const value = values[index]
      object[headerName] = value === '' ? undefined : value
      return object
    }, {})

    this.push(object)
  }
}

export function createDelimitedParseTransform(options) {
  return new DelimitedToObjectTransform(options)
}
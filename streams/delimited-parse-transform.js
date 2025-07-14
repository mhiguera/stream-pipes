import LineReader from './line-reader.js'

const DEFAULT_DELIMITER = ','

export default class DelimitedToObjectTransform extends LineReader {
  constructor(delimiter = DEFAULT_DELIMITER, options = {}) {
    super({ objectMode: true, ...options })
    this.delimiter = delimiter
    this.regex = new RegExp(`(?:^|${this.delimiter})(?:"((?:[^"\\r\\n]|"")*?)"|([^${this.delimiter}\\r\\n]*))`, 'g')
    this.buffer = null
    this.headers = []
    this.fieldsCount = 0
    this.headersWritten = false
  }

  extractValues(line) {
    return [...line.matchAll(this.regex)].map((m) => (m[1] || m[2] || '').replace('""', '"'))
  }

  processLine(line) {
    const fullLine = this.buffer ? [this.buffer, line].join('\n') : line
    const values = this.extractValues(fullLine)
    if (!this.headersWritten) {
      this.fieldsCount = values.length
      this.headers = values
      this.headersWritten = true
      return
    } else {
      if (values.length < this.fieldsCount) {
        this.buffer = fullLine
        return
      } else {
        this.buffer = null
        if (values.length > this.fieldsCount) return
      }
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
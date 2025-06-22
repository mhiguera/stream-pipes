import fs from 'fs'
import { Readable, Writable } from 'stream'
import { finished, pipeline } from 'stream/promises'
import test from 'tape'
import zlib from 'zlib'
import {
  createBatchTransform,
  createDelimitedParseTransform,
  createFileReader,
  createFileWriter,
  createJsonTransform,
  createLineReader,
  createLineWriter,
  createMapTransform,
  createTapTransform
} from './index.js'

function collect(stream) {
  const output = []
  const collector = new Writable({
    objectMode: true,
    write(chunk, _, cb) {
      output.push(chunk)
      cb()
    }
  })
  return finished(stream.pipe(collector)).then(() => output)
}

test('map: should support async mapping functions', async t => {
  const input = Readable.from([{ x: 1 }, { x: 2 }], { objectMode: true })
  const mapper = createMapTransform(async (obj) => ({ y: obj.x * 10 }))
  const result = await collect(input.pipe(mapper))
  t.deepEqual(result, [{ y: 10 }, { y: 20 }])
  t.end()
})

test('map: handles transform that does not call push', async t => {
  const input = Readable.from([{ skip: true }, { keep: true }], { objectMode: true })
  const mapper = createMapTransform((obj, push) => {
    if (obj.keep) push(obj)
  })
  const result = await collect(input.pipe(mapper))

  t.deepEqual(result, [{ keep: true }])
  t.end()
})

test('tap: async tap function support', async t => {
  const seen = []
  const input = Readable.from([{ a: 1 }, { a: 2 }], { objectMode: true })
  const tap = createTapTransform(async (obj) => {
    await new Promise(r => setTimeout(r, 5))
    seen.push(obj)
  })

  const result = await collect(input.pipe(tap))
  t.deepEqual(result, seen)
  t.end()
})

test('batch: batches large set of objects', async t => {
  const input = Readable.from(Array.from({ length: 103 }, (_, i) => ({ i })), { objectMode: true })
  const batch = createBatchTransform(25)
  const result = await collect(input.pipe(batch))

  t.equal(result.length, 5)
  t.equal(result[0].length, 25)
  t.equal(result[4].length, 3)
  t.end()
})

test('json: output includes newline', async t => {
  const input = Readable.from([{ a: 1 }, { b: 2 }], { objectMode: true })
  const transform = createJsonTransform()
  const chunks = []

  await finished(input.pipe(transform).pipe(new Writable({
    write(chunk, _, cb) {
      chunks.push(chunk.toString())
      cb()
    }
  })))

  t.equal(chunks[0], `{"a":1}\n`)
  t.equal(chunks[1], `{"b":2}\n`)
  t.end()
})

test('csv: handles delimited parsing', async t => {
  const input = Readable.from(['name,age', 'John,40', 'Jane,30'].join('\n'))
  const parser = createDelimitedParseTransform()
  const result = await collect(input.pipe(parser))

  t.deepEqual(result, [
    { name: 'John', age: '40' },
    { name: 'Jane', age: '30' }
  ])
  t.end()
})

test('full pipeline (string input)', async t => {
  const input = Readable.from(['x,y', '1,2', '3,4'].join('\n'))
  const pipeline = input
    .pipe(createDelimitedParseTransform())
    .pipe(createMapTransform(obj => ({ x: Number(obj.x), y: Number(obj.y) })))
    .pipe(createBatchTransform(2))
    .pipe(createJsonTransform())

  const result = []
  await finished(pipeline.pipe(new Writable({
    write(chunk, _, cb) {
      result.push(chunk.toString())
      cb()
    }
  })))

  t.true(result[0].includes('[{"x":1,"y":2},{"x":3,"y":4}]'))
  t.end()
})

test('error handling: map throws', t => {
  const input = Readable.from([{ id: 1 }, { id: 2 }], { objectMode: true })
  const mapper = createMapTransform(obj => {
    if (obj.id === 2) throw new Error('broken')
    return obj
  })

  mapper.once('error', err => {
    t.equal(err.message, 'broken')
    t.end()
  })
  input.pipe(mapper)
})

test('createLineReader handles gzipped input', async t => {
  const file = 'tmp.compressed.csv.gz'
  const lines = ['foo,bar', 'a,1', 'b,2']
  const out = fs.createWriteStream(file)
  const gzip = zlib.createGzip()
  gzip.pipe(out)
  for (const line of lines) gzip.write(line + '\n')
  gzip.end()
  await new Promise(res => out.on('finish', res))
  const stream = createFileReader(file).pipe(createLineReader())
  const result = await collect(stream)
  t.deepEqual(result.map(x => x.trim()), lines)
  t.end()
  fs.unlinkSync(file)
})

test('createMapTransform should map objects', async t => {
  const input = Readable.from([{ a: 1 }, { a: 2 }], { objectMode: true })
  const mapper = createMapTransform(o => ({ b: o.a * 2 }))
  const result = await collect(input.pipe(mapper))

  t.deepEqual(result, [{ b: 2 }, { b: 4 }])
  t.end()
})

test('createBatchStream should batch objects', async t => {
  const input = Readable.from([1, 2, 3, 4, 5], { objectMode: true })
  const batch = createBatchTransform(2)
  const result = await collect(input.pipe(batch))

  t.deepEqual(result, [[1, 2], [3, 4], [5]])
  t.end()
})

test('createTapTransform should not alter data', async t => {
  const seen = []
  const input = Readable.from([{ x: 1 }, { x: 2 }], { objectMode: true })
  const tap = createTapTransform(obj => seen.push(obj))
  const result = await collect(input.pipe(tap))

  t.deepEqual(result, seen)
  t.end()
})

test('createJsonTransform should stringify objects', async t => {
  const input = Readable.from([{ foo: 'bar' }, { num: 42 }], { objectMode: true })
  const json = createJsonTransform()
  const chunks = []
  await finished(input.pipe(json).pipe(new Writable({
    write(chunk, _, cb) {
      chunks.push(chunk.toString())
      cb()
    }
  })))

  t.equal(chunks[0], `{"foo":"bar"}\n`)
  t.equal(chunks[1], `{"num":42}\n`)
  t.end()
})

test('createDelimitedParseTransform should parse CSV lines', async t => {
  const lines = ['name,age', 'Alice,30', 'Bob,25'].join('\n')
  const input = Readable.from(lines)
  const parser = createDelimitedParseTransform()
  const result = await collect(input.pipe(parser))

  t.deepEqual(result, [
    { name: 'Alice', age: '30' },
    { name: 'Bob', age: '25' }
  ])
  t.end()
})

test('createDelimitedParseTransform should parse custom separated lines', async t => {
  const lines = ['name#age', 'Alice#30', 'Bob#25'].join('\n')
  const input = Readable.from(lines)
  const parser = createDelimitedParseTransform('#')
  const result = await collect(input.pipe(parser))

  t.deepEqual(result, [
    { name: 'Alice', age: '30' },
    { name: 'Bob', age: '25' }
  ])
  t.end()
})


test('Full pipeline from gzipped CSV to jsonl', async t => {
  const file = 'tmp.data.csv.gz'
  const lines = ['name,age', 'Charlie,22', 'Dana,27']
  const compressed = zlib.createGzip()
  const outStream = fs.createWriteStream(file)
  compressed.pipe(outStream)
  lines.forEach(line => compressed.write(line + '\n'))
  compressed.end()
  const result = []
  await finished(outStream)
  await finished(
    createFileReader(file)
      .pipe(createDelimitedParseTransform())
      .pipe(createMapTransform(obj => ({ ...obj, age: Number(obj.age) })))
      .pipe(createTapTransform(obj => result.push(obj)))
      .pipe(createBatchTransform(2))
      .pipe(createJsonTransform())
      .pipe(new Writable({
        write(chunk, _, cb) {
          cb()
        }
      }))
  )

  t.deepEqual(result, [
    { name: 'Charlie', age: 22 },
    { name: 'Dana', age: 27 }
  ])
  t.end()
  fs.unlinkSync(file)
})


test('round-trip plain text: createLineReader -> createWriteLine', async t => {
  const inputPath = './roundtrip-input.txt'
  const outputPath = './roundtrip-output.txt'
  const originalLines = ['a', 'b', '1', 'c', '2']

  fs.writeFileSync(inputPath, originalLines.join('\n') + '\n')

  await pipeline(
    createFileReader(inputPath),
    createLineReader(),
    createLineWriter(),
    createFileWriter(outputPath)
  )
  const result = fs.readFileSync(outputPath, 'utf-8').trim().split('\n')
  t.deepEqual(result, originalLines, 'Round-trip plain text successful')

  fs.unlinkSync(inputPath)
  fs.unlinkSync(outputPath)
  t.end()
})

test('round-trip gzip: createLineReader -> createWriteLine', async t => {
  const inputPath = 'tmp.roundtrip-input.txt.gz'
  const outputPath = 'tmp.roundtrip-output.txt.gz'
  const originalLines = ['a', 'b', '1', 'c', '2']
  const compressed = zlib.gzipSync(originalLines.join('\n') + '\n')
  fs.writeFileSync(inputPath, compressed)

  await pipeline(
    createFileReader(inputPath),
    createLineReader(),
    createLineWriter(),
    createFileWriter(outputPath)
  )

  const outputBuffer = fs.readFileSync(outputPath)
  const outputLines = zlib.gunzipSync(outputBuffer).toString('utf-8').trim().split('\n')

  t.deepEqual(outputLines, originalLines, 'Round-trip gzip successful')

  fs.unlinkSync(inputPath)
  fs.unlinkSync(outputPath)
  t.end()
})

test('createWriteLine writes lines to plain text file', async t => {
  const outputPath = 'tmp.test-output.txt'
  const data = ['one', 'two', 'three']
  const lines = arr => Readable.from(arr)

  await pipeline(
    lines(data),
    createLineWriter(),
    createFileWriter(outputPath)
  )

  const content = fs.readFileSync(outputPath, 'utf-8')
  const linesRead = content.trim().split('\n')
  t.deepEqual(linesRead, data, 'Plain text lines written correctly')
  fs.unlinkSync(outputPath)
  t.end()
})

test('createWriteLine writes gzip-compressed file', async t => {
  const outputPath = 'tmp.test-output.txt.gz'
  const data = ['apple', 'banana', 'cherry']
  const lines = arr => Readable.from(arr)

  await pipeline(
    lines(data),
    createLineWriter(),
    createFileWriter(outputPath)
  )

  const buffer = fs.readFileSync(outputPath)
  const decompressed = zlib.gunzipSync(buffer).toString('utf-8')
  const linesRead = decompressed.trim().split('\n')

  t.deepEqual(linesRead, data, 'Gzip lines written and decompressed correctly')
  fs.unlinkSync(outputPath)
  t.end()
})

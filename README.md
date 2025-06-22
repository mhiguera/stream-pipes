# stream-pipes

Modular and composable data transformation streams for Node.js. 
`stream-pipes` helps you process data on-the-fly using clean, functional-style pipelines built on Node's stream API.

## Features

- Object-mode stream transforms
- Convert objects to newline-delimited JSON
- Parse delimited text lines into objects
- Batch objects into fixed-size arrays
- Apply custom object transformations
- Perform side effects without altering the data (tap)
- Read and write files as streams, with optional Gzip compression
- Read and write lines from/to files and generic streams

## Installation

```bash
npm install stream-pipes
```

## Example

```js
import { pipeline } from 'stream/promises'

import {
  createFileReader,
  createFileWriter,
  createDelimitedParseTransform,
  createMapTransform,
  createBatchStream,
  createTapTransform,
  createJsonTransform
} from 'stream-pipes'

await pipeline(
  createFileReader('./data.csv.gz'),
  createDelimitedParseTransform({ delimiter: ',' }),
  createMapTransform((obj) => ({ ...obj, processed: true })),
  createTapTransform(() => console.log('Processed!')),
  createBatchStream(10),
  createJsonTransform(),
  createFileWriter('./output.jsonl.gz')
)
```

## Available Streams & Utilities

### Summary

| Function                                       | Description                                      | Input                   | Output                         |
| ---------------------------------------------- | ------------------------------------------------ | ----------------------- | ------------------------------ |
| `createFileReader(path)`                       | Reads a file (gzip supported)                    | File content            | Stream of chunks               |
| `createFileWriter(path)`                       | Writes chunks to a file (gzip supported)         | `"..."` (string/buffer) | Writes raw data                |
| `createLineReader()`                           | Splits text stream by lines                      | Stream of text chunks   | One line per chunk (string)    |
| `createLineWriter()`                           | Writes each string with a trailing newline       | `"..."` (string)        | One line per write             |
| `createDelimitedParseTransform({ delimiter })` | Parses delimited text into objects               | `"name,age\nAlice,30"`  | `{ name: "Alice", age: "30" }` |
| `createMapTransform(fn)`                       | Applies a custom function to each object         | `{ name: "Alice" }`     | `fn({ name: "Alice" })`        |
| `createBatchStream(size)`                      | Groups objects into fixed-size arrays            | `{...}, {...}`          | `[ {...}, {...}, {...} ]`      |
| `createJsonTransform()`                        | Converts each object to JSON string with newline | `{ name: "Alice" }`     | `"{"name":"Alice"}\n"`         |
| `createTapTransform(fn)`                       | Runs a side-effect function per object           | `{ name: "Alice" }`     | `{ name: "Alice" }`            |


### `createFileReader(path)`

Creates a readable stream from a file. If the path ends with `.gz`, it's automatically decompressed.

```js
import { createFileReader } from 'stream-pipes'

const textStream = createFileReader('file.txt')
const gzipStream = createFileReader('file.txt.gz')
```

### `createFileWriter(path)`
Creates a writable stream to a file. If the path ends with `.gz`, the stream automatically compresses the output using Gzip.

```js
import { createLineWriter } from 'stream-pipes'

const writer = createFileWriter('output.txt')     // writes plain text lines
const gzipWriter = createFileWriter('output.txt.gz') // compresses with gzip
```

### `createLineReader`
Returns a transform stream that splits incoming text by newlines.

```js
import { createLineReader } from 'stream-pipes'

source.pipe(createLineReader()).on('data', console.log)
```
### `createLineWriter`
Returns a transform stream that splits incoming text by newlines.

```js
import { createLineWriter } from 'stream-pipes'

stream.pipe(createLineWriter()).pipe(createFileWriter('lines.txt'))
```

### `createDelimitedParseTransform({ delimiter })`
Transforms delimited text lines (e.g., CSV) into JavaScript objects using the first line as headers.

```js
import { createDelimitedParseTransform } from 'stream-pipes'

const csvParser = createDelimitedParseTransform({ delimiter: ',' })
```

### `createMapTransform(fn)`
Applies a synchronous or asynchronous function fn to each incoming object and pushes the result downstream.

```js
import { createMapTransform } from 'stream-pipes'

const transform = createMapTransform(obj => ({
  ...obj,
  processed: true
}))
```

### ` createBatchStream(size)`

Groups incoming objects into arrays of fixed size size before pushing them downstream.

```js
import { createBatchStream } from 'stream-pipes'

const batcher = createBatchStream(10)  // emit arrays of 10 objects
```
### `createJsonTransform()`
Converts each incoming object to a JSON string followed by a newline character (\n), ideal for creating JSON Lines (jsonl) streams.

```js
import { createJsonTransform } from 'stream-pipes'
const jsonStringify = createJsonTransform()
```

### `createTapTransform(fn)`
Runs a side-effect function fn on each object passing through, without modifying the data.

```js
import { createTapTransform } from 'stream-pipes'
const logger = createTapTransform(obj => console.log('Passing object:', obj))
```


## License

[MIT](LICENSE)
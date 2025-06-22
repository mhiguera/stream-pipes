export function createFileReader(path: string, options?: object): NodeJS.ReadableStream;

export function createFileWriter(path: string, options?: object): NodeJS.WritableStream;

export function createDelimitedParseTransform(
  delimiter: string,
  options?: object
): NodeJS.Transform;

export function createMapTransform<T = any>(
  mapFn: (chunk: any, push?: (chunk: T) => void) => void,
  options?: object
): NodeJS.Transform;

export function createBatchTransform(
  batchSize?: number,
  options?: object
): NodeJS.Transform;

export function createTapTransform(
  tapFn: (chunk: any) => void,
  options?: object
): NodeJS.Transform;

export function createJsonTransform(
  options?: object
): NodeJS.Transform;

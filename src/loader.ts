/// <reference types="node" />

import { createGunzip } from 'zlib';
import { createReadStream } from 'fs';
import { extract } from 'tar-fs';
import { IFs, Volume, createFsFromVolume } from 'memfs';
import { join } from 'path';
import { Readable } from 'stream';

declare module 'tar-fs' {
  interface ExtractOptions {
    fs?: IFs;
  }
}

// The cached unzipped data of file `core.dump.gz`.
let coredump: Uint8Array;

// The cached unzipped data of file `tex.wasm.gz`.
let bytecode: Uint8Array;

// The memory filesystem that stores the TeX files extracted from `tex_files.tar.gz`.
let memfs: IFs;

let rootPath: string = __dirname;
// The directory where the TeX files are located (core.dump.gz, tex.wasm.gz, tex_files.tar.gz).
let TEX_DIR = join(rootPath, '../tex');
// Paths of the TeX files.
let COREDUMP_PATH = join(TEX_DIR, 'core.dump.gz');
let BYTECODE_PATH = join(TEX_DIR, 'tex.wasm.gz');
let TEX_FILES_PATH = join(TEX_DIR, 'tex_files.tar.gz');
const TEX_FILES_EXTRACTED_PATH = join('/', 'tex_files');

/**
 * Get core dump data.
 * @returns {Uint8Array}
 */
export function dumpCore(): Uint8Array {
  return coredump;
}

/**
 * Get tex wasm data.
 * @returns {Uint8Array}
 */
export function texWasm(): Uint8Array {
  return bytecode;
}

/**
 * Get the memory filesystem.
 * @returns {IFs}
 *
 * @example
 * ```js
 * import { toTreeSync } from 'memfs/lib/print';
 * console.log(toTreeSync(memFS()));
 * ```
 */
export function memFS(): IFs {
  return memfs;
}

/**
 * Extract files from `tex_files.tar.gz` into a memory filesystem.
 * The tarball contains files needed by the TeX engine, such as `pgfplots.code.tex`.
 */
async function extractTexFilesToMemory() {
  const volume = new Volume();
  const fs = createFsFromVolume(volume);

  fs.mkdirSync('/lib');

  const stream = createReadStream(TEX_FILES_PATH).pipe(createGunzip()).pipe(
    extract(TEX_FILES_EXTRACTED_PATH, {
      fs,
    }),
  );

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return fs;
}

/**
 * Convert a stream to a buffer.
 * @param {Readable} stream The input stream.
 */
async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buf: Buffer[] = [];

    stream.on('data', (chunk) => buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buf)));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Load necessary files into memory.
 * @param {string} [root] The root path where the TeX files are located.
 */
export async function load(root?: string) {
  if (coredump && bytecode && memfs) return;

  root = root ?? rootPath;
  setRootPath(root);

  if (!coredump) {
    const stream = createReadStream(COREDUMP_PATH).pipe(createGunzip());
    coredump = await stream2buffer(stream);
  }

  if (!bytecode) {
    const stream = createReadStream(BYTECODE_PATH).pipe(createGunzip());
    bytecode = await stream2buffer(stream);
  }

  if (!memfs) {
    memfs = await extractTexFilesToMemory();
  }
}

/**
 * A helper function to generate a unique ID for each SVG element.
 * This use BKDR hash algorithm.
 *
 * @param {string} str The string to hash.
 * @param {number} seed The seed value. Default is 31.
 * @returns {number} The hash of the string.
 */
export function hashCode(str: string, seed: number = 13131): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * seed + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/**
 * Get root path.
 *
 * @returns {string} the root path
 */
export function getRootPath(): string {
  return rootPath;
}

/**
 * Set root path.
 *
 * @param {string} root the root path
 */
export function setRootPath(root: string) {
  if (root !== rootPath) {
    rootPath = root;
    TEX_DIR = join(rootPath, '../tex');
    COREDUMP_PATH = join(TEX_DIR, 'core.dump.gz');
    BYTECODE_PATH = join(TEX_DIR, 'tex.wasm.gz');
    TEX_FILES_PATH = join(TEX_DIR, 'tex_files.tar.gz');
  }
}

import tar from 'tar-stream';
import { IFs, Volume, createFsFromVolume } from 'memfs';
import pako from 'pako';

// The cached unzipped data of file `core.dump.gz`.
let coredump: Uint8Array;
// The cached unzipped data of file `tex.wasm.gz`.
let bytecode: Uint8Array;
// The memory filesystem that stores the TeX files extracted from `tex_files.tar.gz`.
let memfs: IFs;
// The root directory where the TeX files are remoted (core.dump.gz, tex.wasm.gz, tex_files.tar.gz).
let rootPath: string = '.';
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
  const texTar = await loadDecompress('tex_files.tar.gz');
  const volume = new Volume();
  const fs = createFsFromVolume(volume);
  fs.mkdirSync('/lib', { recursive: true });

  // create tar extract stream
  const extract = tar.extract();
  // listen for 'entry' event to process each file
  extract.on('entry', (header, stream, next) => {
    if (header.name === './' || header.name === '.') {
      // process next file
      next();
      return;
    }

    const filename = header.name.startsWith('./') ? header.name.substring(2) : header.name;
    // generate file path in memfs
    const filePath = `/tex_files/${filename}`;
    const dirPath = filePath.split('/').slice(0, -1).join('/');
    // create directory if needed
    if (dirPath) fs.mkdirSync(dirPath, { recursive: true });
    // write file to memfs
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    stream.on('end', () => {
      // process next file
      next();
    });
  });
  // write tar data into extract stream
  extract.write(texTar);
  extract.end();
  await new Promise((resolve, reject) => {
    // resolve 'finish' event
    extract.on('finish', resolve);
    // reject 'error' event
    extract.on('error', reject);
  });
  return fs;
}

/**
 * Load and decompress a file from the remote tex directory.
 *
 * @param file the file name
 */
async function loadDecompress(file: string) {
  const response = await fetch(`${rootPath}/../tex/${file}`);
  if (response.ok && response.body) {
    const reader = response.body.getReader();
    const inflate = new pako.Inflate();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      inflate.push(value);
    }
    reader.releaseLock();
    if (inflate.err) throw new Error(`Inflate error: ${inflate.err}`);
    if (typeof inflate.result === 'string') {
      return Buffer.from(inflate.result);
    }
    return inflate.result;
  }
  throw new Error(`Unable to load ${file}. File not available.`);
}
/**
 * Load necessary files into memory.
 *
 * @param {string} [root] The root path where the TeX files are remoted.
 * @returns {Promise<void>} The promise that resolves when loading is complete.
 */
export async function load(root?: string): Promise<void> {
  if (coredump && bytecode && memfs) return;

  root = root ?? rootPath;
  setRootPath(root);
  if (!coredump) {
    coredump = await loadDecompress('core.dump.gz');
  }
  if (!bytecode) {
    bytecode = await loadDecompress('tex.wasm.gz');
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
 * @returns {string}
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
  }
}

import { dumpCore, memFS, texWasm } from './loader';
import * as library from './library';
import { type TeXOptions } from './types';

/**
 * Run the TeX engine to compile TeX source code.
 *
 * @param input The TeX source code.
 * @returns The generated DVI file.
 */
export async function tex(input: string, options: TeXOptions = {}) {
  // Set up the tex input file.
  const preamble = getTexPreamble(options);
  input = preamble + input;

  if (options.showConsole) {
    library.setShowConsole();

    console.log('TikZJax: Rendering input:');
    console.log(input);
  }

  // Write the tex input file into the memory filesystem.
  library.writeFileSync(`input.tex`, Buffer.from(input));

  // Copy the coredump into the memory.
  const memory = new WebAssembly.Memory({ initial: library.pages, maximum: library.pages });
  const buffer = new Uint8Array(memory.buffer, 0, library.pages * 65536);
  buffer.set(dumpCore().slice(0));

  library.setMemory(memory.buffer);
  library.setInput(` input.tex \n\\end\n`);

  // Set the file loader to read files from the memory filesystem.
  library.setFileLoader(readTexFileFromMemory);

  // Set up the WebAssembly TeX engine.
  const wasm = await WebAssembly.instantiate(texWasm(), {
    library: library,
    env: { memory: memory },
  });

  // Execute TeX and extract the generated DVI file.
  /** @ts-ignore */
  await library.executeAsync(wasm.instance.exports);

  try {
    const dvi = Buffer.from(library.readFileSync(`input.dvi`));

    // Clean up the library for the next run.
    library.deleteEverything();

    return dvi;
  } catch (e) {
    library.deleteEverything();
    throw new Error(`TeX engine render failed: ${e}`);
  }
}

/**
 * Get preamble of the TeX input file.
 */
export function getTexPreamble(options: TeXOptions = {}) {
  let texPackages = options.texPackages ?? {};

  const preamble =
    Object.entries(texPackages).reduce((usePackageString, thisPackage) => {
      usePackageString +=
        '\\usepackage' + (thisPackage[1] ? `[${thisPackage[1]}]` : '') + `{${thisPackage[0]}}`;
      return usePackageString;
    }, '') +
    (options.tikzLibraries ? `\\usetikzlibrary{${options.tikzLibraries}}` : '') +
    (options.addToPreamble || '') +
    (options.tikzOptions ? `[${options.tikzOptions}]` : '') +
    '\n';

  return preamble;
}

/**
 * Read a file from the memory filesystem.
 */
async function readTexFileFromMemory(name: string) {
  const buffer = memFS().readFileSync(name) as Buffer;
  return buffer;
}

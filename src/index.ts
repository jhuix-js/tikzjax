import { load, memFS, getRootPath, setRootPath } from './loader';
import { tex, getTexPreamble } from './texify';
import { dvi2svg } from './dvi2svg';
import { type TikzOptions, type Tikz } from './types';

export * from './types';
export { load, memFS, tex, dvi2svg, getTexPreamble };

/**
 * Compiles TeX source code to SVG image.
 * @param {string }input The TeX source code.
 * @param {TikzOptions} options Options for Tikz rendering.
 * @returns {string} The generated SVG image as a string.
 */
export async function tex2svg(input: string, options?: TikzOptions) {
  await load(options?.rootPath);

  const dvi = await tex(input, options);
  const svg = await dvi2svg(dvi, options);
  return svg;
}

/**
 * Default behavior: set root URL based on the current script location.
 */
if (typeof document !== 'undefined' && document.currentScript) {
  /** @ts-ignore */
  const url = document.currentScript.src;
  const rootUrl = url.replace(/\/(index|tikz-worker)\.js(?:\?.*)?$/, '');
  setRootPath(rootUrl);
}

/**
 * The TikZJax main interface.
 */
const TikZJax: Tikz = {
  load,
  memFS,
  tex,
  dvi2svg,
  tex2svg,
  getTexPreamble,
  getRootPath,
  setRootPath,
};

export default TikZJax;

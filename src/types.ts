import { type IFs } from 'memfs';

export { IFs };

export type TeXOptions = {
  /**
   * Print log of TeX engine to console. Default: `false`
   */
  showConsole?: boolean;

  /**
   * Additional TeX packages to load. Default: `{}`
   *
   * @example
   * ```js
   * // => \usepackage{pgfplots}\usepackage[intlimits]{amsmath}
   * texPackages: { pgfplots: '', amsmath: 'intlimits' },
   * ```
   */
  texPackages?: Record<string, string>;

  /**
   * Additional TikZ libraries to load. Default: `''`
   *
   * @example
   * ```js
   * // => \usetikzlibrary{arrows.meta,calc}
   * tikzLibraries: 'arrows.meta,calc',
   * ```
   */
  tikzLibraries?: string;

  /**
   * Additional options to pass to the TikZ package. Default: `''`
   */
  tikzOptions?: string;

  /**
   * Additional source code to add to the preamble of input. Default: `''`
   */
  addToPreamble?: string;
};

export type SvgOptions = {};

/**
 * Options for rendering TikZ diagrams.
 */
export interface TikzOptions extends TeXOptions, SvgOptions {
  rootPath?: string;
}

/**
 * Main Tikz interface.
 */
export interface Tikz {
  load: (root?: string) => Promise<void>;
  memFS: () => IFs;
  tex: (input: string, options?: TikzOptions) => Promise<Uint8Array>;
  dvi2svg: (dvi: Uint8Array, options?: SvgOptions) => Promise<string>;
  tex2svg: (input: string, options?: TikzOptions) => Promise<string>;
  getTexPreamble: () => string;
  getRootPath: () => string;
  setRootPath: (url: string) => void;
}
